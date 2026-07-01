import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { ApiEnv } from '@mating/config';
import {
  PAYMENT_PROOF_BUCKET,
  PAYMENT_PURPOSES,
  PAYMENT_PROVIDER_CODES,
  REGIONS,
  type PaymentProviderCode,
  type RegionCode,
} from '@mating/shared';

import {
  ApiError,
  ERROR_CODES,
  buildPage,
  clampLimit,
  type AuthenticatedUser,
} from '../../common';
import { API_ENV } from '../../config/app-config.module';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  type InMemoryBreedingRequestsRepository,
} from '../breeding-requests/breeding-requests.repository';
import { assertParticipant } from '../breeding-requests/policies/breeding-request.policy';
import {
  MARKETPLACE_REPOSITORY,
  type InMemoryMarketplaceRepository,
} from '../marketplace/marketplace.repository';
import { STORAGE_PROVIDER } from '../../infra/storage/storage.module';
import type { StorageProvider } from '@mating/shared';
import { AnalyticsService } from '../analytics/analytics.service';
import { LedgerWriterService } from '../wallet-ledger/ledger-writer.service';
import type { CreatePaymentIntentDto } from './dto/payment.dto';
import type { PaymentIntent } from './entities/payment.entity';
import {
  paymentConfirmedEvent,
  paymentIntentCreatedEvent,
  paymentProofUploadedEvent,
  paymentReconciledEvent,
  paymentRefundedEvent,
  webhookDuplicateIgnoredEvent,
  webhookReceivedEvent,
  type PaymentAuditEvent,
} from './events/payment.events';
import { PaymentConfirmedHandler } from './events/payment-confirmed.handler';
import {
  PAYMENTS_REPOSITORY,
  InMemoryPaymentsRepository,
} from './payments.repository';
import { PaymentProviderFactory } from './providers/payment-provider.factory';

@Injectable()
export class PaymentsService {
  private readonly providerFactory: PaymentProviderFactory;

  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly repo: InMemoryPaymentsRepository,
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breedingRepo: InMemoryBreedingRequestsRepository,
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: PaymentAuditEvent): Promise<void> },
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(API_ENV) env: ApiEnv,
    @Inject(forwardRef(() => LedgerWriterService)) private readonly ledgerWriter: LedgerWriterService,
    private readonly paymentConfirmed: PaymentConfirmedHandler,
    private readonly analytics: AnalyticsService,
  ) {
    this.providerFactory = new PaymentProviderFactory(env);
  }

  async createIntent(dto: CreatePaymentIntentDto, user: AuthenticatedUser): Promise<PaymentIntent> {
    if (!PAYMENT_PURPOSES.includes(dto.purpose)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid purpose.', HttpStatus.BAD_REQUEST);
    }
    if (!PAYMENT_PROVIDER_CODES.includes(dto.provider)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid provider.', HttpStatus.BAD_REQUEST);
    }
    if (dto.amount <= 0) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Amount must be positive.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.repo.findIntentByIdempotency(dto.provider, dto.idempotencyKey);
    if (existing) return existing;

    let payeeId = dto.payeeId ?? null;
    if (dto.requestId) {
      const request = await this.breedingRepo.findById(dto.requestId);
      if (!request) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Breeding request not found.', HttpStatus.NOT_FOUND);
      }
      assertParticipant(request, user);
      payeeId = request.recipientId;
    }

    const adapter = this.providerFactory.resolve(dto.provider);
    const providerResult = await adapter.createPaymentIntent({
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      purpose: dto.purpose,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto as unknown as Record<string, unknown>,
    });

    const intent = await this.repo.createIntent({
      requestId: dto.requestId ?? null,
      payerId: user.id,
      payeeId,
      provider: dto.provider,
      providerReference: providerResult.providerReference,
      purpose: dto.purpose,
      status: dto.provider === 'bank_transfer' ? 'created' : 'pending_provider',
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      idempotencyKey: dto.idempotencyKey,
      metadata: {
        checkoutUrl: providerResult.checkoutUrl,
        boostOrderId: dto.boostOrderId,
        subscriptionPlanId: dto.subscriptionPlanId,
      },
    });

    if (dto.requestId) {
      const request = await this.breedingRepo.findById(dto.requestId);
      if (request) {
        await this.breedingRepo.updateStatus(request.id, request.status, {
          metadata: { paymentIntentId: intent.id },
        });
      }
    }

    await this.audit.emit(paymentIntentCreatedEvent(user.id, intent.id, { purpose: dto.purpose }));
    await this.analytics.capture({
      event: 'payment_initiated',
      accountId: user.id,
      properties: { intentId: intent.id, purpose: dto.purpose },
    });

    return intent;
  }

  async getIntent(id: string, user: AuthenticatedUser) {
    const intent = await this.requireIntent(id);
    if (intent.payerId !== user.id && intent.payeeId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }
    return {
      ...intent,
      proofUploaded: Boolean(intent.metadata.proofPath),
    };
  }

  async listIntents(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: string; purpose?: string },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listIntentsForPayer(user.id, { ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async createProofUploadUrl(
    intentId: string,
    user: AuthenticatedUser,
    input: { contentType: string; filename: string },
  ) {
    const intent = await this.requireIntent(intentId);
    if (intent.payerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Only payer may upload proof.', HttpStatus.FORBIDDEN);
    }
    if (intent.provider !== 'bank_transfer') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Proof only for bank transfer.', HttpStatus.BAD_REQUEST);
    }
    if (!['created', 'pending_proof'].includes(intent.status)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Intent not awaiting proof.', HttpStatus.BAD_REQUEST);
    }

    const path = `${user.id}/${intentId}/${input.filename}`;
    const signed = await this.storage.createSignedUploadUrl({
      bucket: PAYMENT_PROOF_BUCKET,
      path,
      contentType: input.contentType,
    });
    return { url: signed.url, path, expiresAt: signed.expiresAt };
  }

  async attachProof(intentId: string, user: AuthenticatedUser, storagePath: string) {
    const intent = await this.requireIntent(intentId);
    if (intent.payerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Only payer may attach proof.', HttpStatus.FORBIDDEN);
    }
    if (!storagePath.startsWith(`${user.id}/${intentId}/`)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid proof path.', HttpStatus.BAD_REQUEST);
    }

    const updated = await this.repo.updateIntent(intentId, {
      status: 'pending_reconciliation',
      metadata: { ...intent.metadata, proofPath: storagePath },
    });
    await this.audit.emit(paymentProofUploadedEvent(user.id, intentId));
    return updated!;
  }

  async getProofReadUrl(intentId: string, admin: AuthenticatedUser) {
    const intent = await this.requireIntent(intentId);
    const proofPath = intent.metadata.proofPath as string | undefined;
    if (!proofPath) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'No proof uploaded.', HttpStatus.NOT_FOUND);
    }
    const signed = await this.storage.createSignedReadUrl({
      bucket: PAYMENT_PROOF_BUCKET,
      path: proofPath,
    });
    await this.audit.emit({
      action: 'admin.document_accessed',
      actorId: admin.id,
      subjectType: 'payment_intent',
      subjectId: intentId,
    });
    return { readUrl: signed.url, expiresAt: signed.expiresAt };
  }

  async reconcile(intentId: string, admin: AuthenticatedUser, notes?: string) {
    if (!admin.roles.includes('super_admin')) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Admin only.', HttpStatus.FORBIDDEN);
    }
    const intent = await this.requireIntent(intentId);
    if (intent.status !== 'pending_reconciliation') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Intent not pending reconciliation.', HttpStatus.BAD_REQUEST);
    }
    if (!intent.metadata.proofPath) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Proof required.', HttpStatus.BAD_REQUEST);
    }

    return this.confirmIntent(intent, admin.id, 'reconcile', { notes });
  }

  async processWebhook(provider: PaymentProviderCode, rawBody: string, signature: string) {
    const adapter = this.providerFactory.resolve(provider);
    let event;
    try {
      event = await adapter.verifyWebhook({
        payload: rawBody,
        signature,
        headers: { 'x-payment-signature': signature },
      });
    } catch {
      throw new ApiError(ERROR_CODES.UNAUTHENTICATED, 'Invalid signature.', HttpStatus.UNAUTHORIZED);
    }

    const parsed = JSON.parse(rawBody) as { eventId?: string };
    const eventId = String(parsed.eventId ?? event.metadata?.eventId ?? createHash('sha256').update(rawBody).digest('hex'));
    const payloadHash = createHash('sha256').update(rawBody).digest('hex');

    const intent = await this.repo.findIntentByProviderReference(event.providerReference);
    if (!intent) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Intent not found.', HttpStatus.NOT_FOUND);
    }

    const webhookResult = await this.repo.insertWebhookEvent({
      provider,
      providerEventId: eventId,
      paymentIntentId: intent.id,
      payloadHash,
      status: 'processed',
      processedAt: new Date().toISOString(),
    });

    if (!webhookResult.inserted) {
      await this.audit.emit(webhookDuplicateIgnoredEvent(provider, eventId));
      return { status: 'duplicate_ignored' as const };
    }

    await this.audit.emit(webhookReceivedEvent(provider, eventId, intent.id));

    if (event.status === 'confirmed') {
      await this.confirmIntent(intent, 'system', 'webhook');
    }

    return { status: 'processed' as const };
  }

  async confirmIntent(
    intent: PaymentIntent,
    actorId: string,
    source: 'reconcile' | 'webhook',
    metadata: Record<string, unknown> = {},
  ): Promise<PaymentIntent> {
    if (intent.status === 'confirmed') return intent;

    const updated = await this.repo.updateIntent(intent.id, { status: 'confirmed' });
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Intent not found.', HttpStatus.NOT_FOUND);
    }

    if (updated.payeeId) {
      await this.ledgerWriter.writePaymentConfirmed({
        paymentIntentId: updated.id,
        entryType: 'payment_confirmed',
        amount: updated.amount,
        currencyCode: updated.currencyCode,
        payerId: updated.payerId,
        payeeId: updated.payeeId,
        metadata: { source, ...metadata },
      });
    }

    await this.audit.emit(
      source === 'reconcile'
        ? paymentReconciledEvent(actorId, updated.id, metadata)
        : paymentConfirmedEvent(actorId, updated.id, metadata),
    );
    await this.analytics.capture({
      event: 'payment_confirmed',
      accountId: updated.payerId,
      properties: { intentId: updated.id, source },
    });

    await this.paymentConfirmed.onPaymentConfirmed(updated);
    await this.activateBoostIfNeeded(updated);
    await this.activateSubscriptionIfNeeded(updated);

    return updated;
  }

  private async activateBoostIfNeeded(intent: PaymentIntent) {
    const boostOrderId = intent.metadata.boostOrderId as string | undefined;
    if (!boostOrderId || intent.purpose !== 'boost') return;
    const order = await this.repo.findBoostOrderById(boostOrderId);
    if (!order) return;
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 7);
    await this.repo.updateBoostOrder(boostOrderId, {
      status: 'active',
      paymentIntentId: intent.id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });
  }

  private async activateSubscriptionIfNeeded(intent: PaymentIntent) {
    if (intent.purpose !== 'subscription') return;
    const planId = intent.metadata.subscriptionId as string | undefined;
    if (!planId) return;
    await this.repo.updateSubscription(planId, { status: 'active', paymentIntentId: intent.id });
  }

  async createIntentForBreedingRequest(
    requestId: string,
    payerId: string,
    payeeId: string,
    amount: number,
    currencyCode: string,
    purpose: 'deposit' | 'full_fee',
    idempotencyKey: string,
  ): Promise<PaymentIntent> {
    return this.repo.createIntent({
      requestId,
      payerId,
      payeeId,
      provider: 'bank_transfer',
      providerReference: `bt_${idempotencyKey}`,
      purpose,
      status: 'created',
      amount,
      currencyCode,
      idempotencyKey,
      metadata: {},
    });
  }

  getRepository(): InMemoryPaymentsRepository {
    return this.repo;
  }

  private async requireIntent(id: string): Promise<PaymentIntent> {
    const intent = await this.repo.findIntentById(id);
    if (!intent) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Payment intent not found.', HttpStatus.NOT_FOUND);
    }
    return intent;
  }
}
