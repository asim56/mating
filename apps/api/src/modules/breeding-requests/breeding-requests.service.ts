import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  BreedingRequestStateMachine,
  REGIONS,
  type BreedingRequestAction,
  type BreedingRequestStatus,
  type RegionCode,
} from '@mating/shared';

import {
  ApiError,
  ERROR_CODES,
  buildPage,
  clampLimit,
  type AuthenticatedUser,
} from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import {
  MARKETPLACE_REPOSITORY,
  type InMemoryMarketplaceRepository,
} from '../marketplace/marketplace.repository';
import { BreedingRecordsService } from './breeding-records.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from './breeding-requests.repository';
import type { CreateBreedingRequestDto } from './dto/create-breeding-request.dto';
import type { BreedingRequest } from './entities/breeding-request.entity';
import {
  breedingRequestCreatedEvent,
  breedingRequestStatusChangedEvent,
  type BreedingAuditEvent,
} from './events/breeding-request.events';
import {
  assertParticipant,
  assertRecipient,
  assertRequester,
  hasOpenDuplicate,
  validateCreateEligibility,
} from './policies/breeding-request.policy';
import { BreedingNotificationProducer } from '../notifications/producers/breeding-notification.producer';

@Injectable()
export class BreedingRequestsService {
  constructor(
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryBreedingRequestsRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: BreedingAuditEvent): Promise<void> },
    private readonly analytics: AnalyticsService,
    private readonly records: BreedingRecordsService,
    private readonly notifications: BreedingNotificationProducer,
  ) {}

  async create(dto: CreateBreedingRequestDto, user: AuthenticatedUser): Promise<BreedingRequest> {
    const requesterAnimal = await this.animals.findById(dto.requesterAnimalId);
    const recipientAnimal = await this.animals.findById(dto.recipientAnimalId);
    if (!requesterAnimal || !recipientAnimal) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }

    const listing = await this.listings.findById(dto.listingId);
    if (!listing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }

    validateCreateEligibility({
      requesterAnimal,
      recipientAnimal,
      listing,
      breedingMethod: dto.breedingMethod,
      requesterId: user.id,
    });

    const duplicates = await this.repo.listOpenByPair(
      dto.listingId,
      dto.requesterAnimalId,
      dto.recipientAnimalId,
    );
    if (hasOpenDuplicate(duplicates, dto.listingId, dto.requesterAnimalId, dto.recipientAnimalId)) {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        'Duplicate open request for this pair.',
        HttpStatus.CONFLICT,
      );
    }

    const currencyCode =
      REGIONS[requesterAnimal.regionCode as RegionCode]?.currency ?? 'PKR';

    const created = await this.repo.create({
      requesterId: user.id,
      recipientId: listing.ownerId,
      requesterAnimalId: dto.requesterAnimalId,
      recipientAnimalId: dto.recipientAnimalId,
      listingId: dto.listingId,
      breedingMethod: dto.breedingMethod,
      proposedAt: dto.proposedAt ?? null,
      locationType: (dto.locationType as BreedingRequest['locationType']) ?? null,
      locationDetails: dto.locationDetails ?? {},
      currencyCode,
      notes: dto.notes ?? null,
    });

    await this.repo.insertEvent({
      requestId: created.id,
      actorId: user.id,
      eventType: 'status_changed',
      fromStatus: 'Draft',
      toStatus: 'Requested',
      metadata: {},
    });

    await this.audit.emit(breedingRequestCreatedEvent(user.id, created.id));
    await this.analytics.capture({
      event: 'breeding_request_created',
      accountId: user.id,
      properties: { requestId: created.id, listingId: dto.listingId },
    });
    await this.notifications.onStatusChanged(created, null, 'Requested');

    return created;
  }

  async list(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: string; role?: 'requester' | 'recipient' | 'all' },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listForUser({
      userId: user.id,
      role: query.role ?? 'all',
      status: query.status as BreedingRequestStatus | undefined,
      cursor: query.cursor,
      limit,
    });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async getById(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    const events = await this.repo.listEvents(id);
    return { request, events };
  }

  async accept(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertRecipient(request, user);
    return this.transition(request, user, 'accept');
  }

  async reject(id: string, user: AuthenticatedUser, reason?: string) {
    const request = await this.requireRequest(id);
    assertRecipient(request, user);
    return this.transition(request, user, 'reject', { reason });
  }

  async cancel(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    if (request.requesterId !== user.id && request.recipientId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not allowed.', HttpStatus.FORBIDDEN);
    }
    return this.transition(request, user, 'cancel');
  }

  async schedule(
    id: string,
    user: AuthenticatedUser,
    input: { scheduledAt: string; locationType?: string; locationDetails?: Record<string, unknown> },
  ) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    return this.transition(request, user, 'schedule', {
      scheduledAt: input.scheduledAt,
      locationType: input.locationType,
      locationDetails: input.locationDetails,
    });
  }

  async start(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    return this.transition(request, user, 'start');
  }

  async complete(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    return this.transition(request, user, 'complete', {
      completedAt: new Date().toISOString(),
    });
  }

  async generateRecord(id: string, user: AuthenticatedUser, idempotencyKey: string) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    return this.records.generateRecord(request, user, idempotencyKey);
  }

  async close(id: string, user: AuthenticatedUser) {
    const request = await this.requireRequest(id);
    assertParticipant(request, user);
    return this.transition(request, user, 'close');
  }

  private async transition(
    request: BreedingRequest,
    user: AuthenticatedUser,
    action: BreedingRequestAction,
    metadata: Record<string, unknown> = {},
  ): Promise<BreedingRequest> {
    const fromStatus = request.status;
    let toStatus: BreedingRequestStatus;
    try {
      toStatus = BreedingRequestStateMachine.assertTransition(fromStatus, action);
    } catch {
      throw new ApiError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot ${action} from ${fromStatus}.`,
        HttpStatus.CONFLICT,
        { from: fromStatus, action },
      );
    }

    const patch: Partial<BreedingRequest> = {};
    if (metadata.scheduledAt) patch.scheduledAt = String(metadata.scheduledAt);
    if (metadata.completedAt) patch.completedAt = String(metadata.completedAt);
    if (metadata.locationType) patch.locationType = metadata.locationType as BreedingRequest['locationType'];
    if (metadata.locationDetails) patch.locationDetails = metadata.locationDetails as Record<string, unknown>;
    if (metadata.reason) patch.metadata = { cancellationReason: metadata.reason };

    const updated = await this.repo.updateStatus(request.id, toStatus, patch);
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }

    await this.repo.insertEvent({
      requestId: request.id,
      actorId: user.id,
      eventType: 'status_changed',
      fromStatus,
      toStatus,
      metadata,
    });
    await this.audit.emit(
      breedingRequestStatusChangedEvent(user.id, request.id, fromStatus, toStatus, metadata),
    );
    await this.notifications.onStatusChanged(updated, fromStatus, toStatus);

    if (toStatus === 'RecordGenerated') {
      await this.analytics.capture({
        event: 'record_generated',
        accountId: user.id,
        properties: { requestId: request.id },
      });
    }

    return updated;
  }

  private async requireRequest(id: string): Promise<BreedingRequest> {
    const request = await this.repo.findById(id);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    return request;
  }
}
