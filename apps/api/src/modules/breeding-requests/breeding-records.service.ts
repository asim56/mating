import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { BreedingRequestStateMachine } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from './breeding-requests.repository';
import type { BreedingRecord, BreedingRequest } from './entities/breeding-request.entity';
import {
  breedingRecordGeneratedEvent,
  breedingRequestStatusChangedEvent,
  type BreedingAuditEvent,
} from './events/breeding-request.events';

@Injectable()
export class BreedingRecordsService {
  constructor(
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryBreedingRequestsRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: BreedingAuditEvent): Promise<void> },
  ) {}

  async generateRecord(
    request: BreedingRequest,
    user: AuthenticatedUser,
    idempotencyKey: string,
  ): Promise<{ record: BreedingRecord; created: boolean; request: BreedingRequest }> {
    const fromStatus = request.status;
    let updated = request;
    if (fromStatus === 'Completed') {
      const toStatus = BreedingRequestStateMachine.assertTransition(fromStatus, 'generate_record');
      const patched = await this.repo.updateStatus(request.id, toStatus);
      if (!patched) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
      }
      updated = patched;
      await this.repo.insertEvent({
        requestId: request.id,
        actorId: user.id,
        eventType: 'status_changed',
        fromStatus,
        toStatus,
        metadata: { idempotencyKey },
      });
      await this.audit.emit(
        breedingRequestStatusChangedEvent(user.id, request.id, fromStatus, toStatus, {
          idempotencyKey,
        }),
      );
    } else if (fromStatus !== 'RecordGenerated' && fromStatus !== 'Closed') {
      throw new ApiError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'Request must be completed before record generation.',
        HttpStatus.CONFLICT,
        { from: fromStatus, action: 'generate_record' },
      );
    }

    const breedingDate = (updated.completedAt ?? updated.scheduledAt ?? updated.createdAt).slice(
      0,
      10,
    );
    const { record, created } = await this.repo.upsertRecord({
      requestId: updated.id,
      requesterAnimalId: updated.requesterAnimalId,
      recipientAnimalId: updated.recipientAnimalId,
      breedingMethod: updated.breedingMethod,
      breedingDate,
      outcomeStatus: 'pending_follow_up',
      recordPdfPath: null,
      metadata: {
        locationType: updated.locationType,
        locationDetails: updated.locationDetails,
        idempotencyKey,
      },
    });

    if (created) {
      await this.audit.emit(breedingRecordGeneratedEvent(user.id, updated.id, record.id));
    }

    return { record, created, request: updated };
  }
}
