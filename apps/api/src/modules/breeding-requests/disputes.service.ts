import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { BreedingRequestStateMachine } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import { BreedingNotificationProducer } from '../notifications/producers/breeding-notification.producer';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from './breeding-requests.repository';
import type { OpenDisputeDto } from './dto/create-breeding-request.dto';
import type { BreedingRequest, Dispute } from './entities/breeding-request.entity';
import {
  breedingRequestDisputeOpenedEvent,
  breedingRequestStatusChangedEvent,
  type BreedingAuditEvent,
} from './events/breeding-request.events';
import {
  assertParticipant,
  assertValidDisputeReason,
} from './policies/breeding-request.policy';

@Injectable()
export class DisputesService {
  constructor(
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryBreedingRequestsRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: BreedingAuditEvent): Promise<void> },
    private readonly analytics: AnalyticsService,
    private readonly notifications: BreedingNotificationProducer,
  ) {}

  async openDispute(
    requestId: string,
    dto: OpenDisputeDto,
    user: AuthenticatedUser,
  ): Promise<{ dispute: Dispute; request: BreedingRequest }> {
    const request = await this.repo.findById(requestId);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    assertParticipant(request, user);
    assertValidDisputeReason(dto.reasonCode);

    const existing = await this.repo.findOpenDisputeByRequestId(requestId);
    if (existing) {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        'Dispute already open for this request.',
        HttpStatus.CONFLICT,
      );
    }

    const fromStatus = request.status;
    let toStatus;
    try {
      toStatus = BreedingRequestStateMachine.assertTransition(fromStatus, 'open_dispute');
    } catch {
      throw new ApiError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        `Cannot open dispute from ${fromStatus}.`,
        HttpStatus.CONFLICT,
        { from: fromStatus, action: 'open_dispute' },
      );
    }

    const dispute = await this.repo.createDispute({
      requestId,
      openedBy: user.id,
      reasonCode: dto.reasonCode,
      description: dto.description ?? null,
    });

    const updated = await this.repo.updateStatus(requestId, toStatus);
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }

    await this.repo.insertEvent({
      requestId,
      actorId: user.id,
      eventType: 'dispute_opened',
      fromStatus,
      toStatus,
      metadata: { reasonCode: dto.reasonCode, disputeId: dispute.id },
    });

    await this.audit.emit(breedingRequestDisputeOpenedEvent(user.id, requestId, dispute.id));
    await this.audit.emit(
      breedingRequestStatusChangedEvent(user.id, requestId, fromStatus, toStatus, {
        disputeId: dispute.id,
      }),
    );
    await this.analytics.capture({
      event: 'dispute_opened',
      accountId: user.id,
      properties: { requestId, disputeId: dispute.id },
    });
    await this.notifications.onStatusChanged(updated, fromStatus, toStatus);

    return { dispute, request: updated };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<Dispute> {
    const dispute = await this.repo.findDisputeById(id);
    if (!dispute) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Dispute not found.', HttpStatus.NOT_FOUND);
    }
    const request = await this.repo.findById(dispute.requestId);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    const isSupport = user.roles.some((r) => r === 'support_agent' || r === 'super_admin');
    if (!isSupport) {
      assertParticipant(request, user);
    }
    return dispute;
  }
}
