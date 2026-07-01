import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';

import { REFUND_REASON_CODES, type RefundReasonCode } from '@mating/shared';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import type { RefundPaymentDto, ReconcilePaymentDto } from '../payments/dto/payment.dto';
import { paymentRefundedEvent, type PaymentAuditEvent } from '../payments/events/payment.events';
import {
  PAYMENTS_REPOSITORY,
  InMemoryPaymentsRepository,
} from '../payments/payments.repository';
import { PaymentsService } from '../payments/payments.service';
import {
  payoutApprovedEvent,
  payoutReleasedEvent,
  type LedgerAuditEvent,
} from './events/ledger.events';
import { LedgerWriterService } from './ledger-writer.service';
import { LEDGER_REPOSITORY, InMemoryLedgerRepository } from './ledger.repository';

@Injectable()
export class AdminPaymentsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY) private readonly paymentsRepo: InMemoryPaymentsRepository,
    @Inject(LEDGER_REPOSITORY) private readonly ledgerRepo: InMemoryLedgerRepository,
    @Inject(forwardRef(() => PaymentsService)) private readonly payments: PaymentsService,
    @Inject(forwardRef(() => LedgerWriterService)) private readonly ledgerWriter: LedgerWriterService,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: PaymentAuditEvent | LedgerAuditEvent): Promise<void> },
  ) {}

  async listPayments(query: { status?: string; provider?: string; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const rows = await this.paymentsRepo.listIntentsAdmin({ ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async reconcile(intentId: string, admin: AuthenticatedUser, dto: ReconcilePaymentDto) {
    return this.payments.reconcile(intentId, admin, dto.notes);
  }

  async refund(intentId: string, admin: AuthenticatedUser, dto: RefundPaymentDto) {
    if (!dto.reasonCode || !REFUND_REASON_CODES.includes(dto.reasonCode as RefundReasonCode)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'reasonCode is required.', HttpStatus.BAD_REQUEST);
    }

    const intent = await this.paymentsRepo.findIntentById(intentId);
    if (!intent) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Intent not found.', HttpStatus.NOT_FOUND);
    }
    if (intent.status !== 'confirmed') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Intent not confirmed.', HttpStatus.BAD_REQUEST);
    }

    const refundAmount = dto.amount ?? intent.amount;
    const isPartial = refundAmount < intent.amount;

    if (intent.payeeId) {
      await this.ledgerWriter.writeRefund({
        paymentIntentId: intent.id,
        amount: refundAmount,
        currencyCode: intent.currencyCode,
        payerId: intent.payerId,
        payeeId: intent.payeeId,
        reasonCode: dto.reasonCode as RefundReasonCode,
        adminId: admin.id,
        metadata: { notes: dto.notes },
      });
    }

    const updated = await this.paymentsRepo.updateIntent(intentId, {
      status: isPartial ? 'partially_refunded' : 'refunded',
    });

    await this.audit.emit(
      paymentRefundedEvent(admin.id, intentId, { reasonCode: dto.reasonCode, amount: refundAmount }),
    );

    return updated!;
  }

  async listPayoutsAdmin(query: { status?: string; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const rows = await this.ledgerRepo.listPayoutsAdmin({ ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async approvePayout(payoutId: string, admin: AuthenticatedUser, notes?: string) {
    const payout = await this.ledgerRepo.findPayoutById(payoutId);
    if (!payout) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Payout not found.', HttpStatus.NOT_FOUND);
    }
    if (payout.status !== 'pending') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Payout not pending.', HttpStatus.BAD_REQUEST);
    }

    await this.ledgerRepo.updatePayout(payoutId, { status: 'approved', approvedBy: admin.id });
    await this.audit.emit(payoutApprovedEvent(admin.id, payoutId, { notes }));

    await this.ledgerWriter.writePayoutRelease({
      payoutId,
      payeeId: payout.payeeId,
      amount: payout.amount,
      currencyCode: payout.currencyCode,
      adminId: admin.id,
      metadata: { notes },
    });

    const released = await this.ledgerRepo.updatePayout(payoutId, { status: 'released' });
    await this.audit.emit(payoutReleasedEvent(admin.id, payoutId));

    return released!;
  }

  async rejectPayout(payoutId: string, admin: AuthenticatedUser, reason: string) {
    const payout = await this.ledgerRepo.findPayoutById(payoutId);
    if (!payout) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Payout not found.', HttpStatus.NOT_FOUND);
    }
    if (payout.status !== 'pending') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Payout not pending.', HttpStatus.BAD_REQUEST);
    }
    return this.ledgerRepo.updatePayout(payoutId, {
      status: 'rejected',
      metadata: { reason },
    });
  }
}
