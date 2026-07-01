import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';

import { BreedingRequestStateMachine } from '@mating/shared';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import { assertFieldRepForbidden } from '../../common';
import { DisputeRefundService } from './services/dispute-refund.service';
import type { AssignDisputeDto, ResolveDisputeDto } from './dto/dispute-admin.dto';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from './breeding-requests.repository';
import type { Dispute } from './entities/breeding-request.entity';
import { breedingRequestStatusChangedEvent, type BreedingAuditEvent } from './events/breeding-request.events';

export type DisputeAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class DisputeAdminService {
  constructor(
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryBreedingRequestsRepository,
    @Inject(forwardRef(() => DisputeRefundService))
    private readonly refunds: DisputeRefundService,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: BreedingAuditEvent | DisputeAuditEvent): Promise<void> },
    private readonly analytics: AnalyticsService,
  ) {}

  async list(query: {
    status?: string;
    assignedTo?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listDisputes({ ...query, limit });
    const page = buildPage(rows, limit, (row) => row.createdAt);
    return {
      data: page.data.map((d) => ({
        id: d.id,
        requestId: d.requestId,
        status: d.status,
        reasonCode: d.reasonCode,
        assignedTo: d.assignedTo,
        createdAt: d.createdAt,
      })),
      meta: page.meta,
    };
  }

  private assertDisputeAccess(user: AuthenticatedUser): void {
    assertFieldRepForbidden(user, 'disputes');
    if (!user.roles.some((r) => r === 'super_admin' || r === 'support_agent')) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Support access required.', HttpStatus.FORBIDDEN);
    }
  }

  async getById(id: string, user: AuthenticatedUser) {
    this.assertDisputeAccess(user);
    const dispute = await this.repo.findDisputeById(id);
    if (!dispute) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Dispute not found.', HttpStatus.NOT_FOUND);
    }
    const request = await this.repo.findById(dispute.requestId);
    return {
      ...dispute,
      requestSummary: request
        ? { id: request.id, status: request.status, feeAmount: request.feeAmount }
        : null,
      paymentIntentId: dispute.paymentIntentId,
    };
  }

  async assign(id: string, user: AuthenticatedUser, dto: AssignDisputeDto) {
    this.assertDisputeAccess(user);
    const dispute = await this.requireActiveDispute(id);
    const assigneeId = dto.assigneeId ?? user.id;
    const updated = await this.repo.updateDispute(id, {
      status: 'assigned',
      assignedTo: assigneeId,
    });
    await this.audit.emit({
      action: 'dispute.assigned',
      actorId: user.id,
      subjectType: 'dispute',
      subjectId: id,
      metadata: { assigneeId },
    });
    return { id, status: updated!.status, assignedTo: updated!.assignedTo };
  }

  async investigate(id: string, user: AuthenticatedUser) {
    this.assertDisputeAccess(user);
    await this.requireActiveDispute(id);
    const updated = await this.repo.updateDispute(id, { status: 'investigating' });
    return { id, status: updated!.status };
  }

  async resolve(id: string, user: AuthenticatedUser, dto: ResolveDisputeDto) {
    this.assertDisputeAccess(user);
    const dispute = await this.repo.findDisputeById(id);
    if (!dispute) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Dispute not found.', HttpStatus.NOT_FOUND);
    }
    if (dispute.status === 'resolved') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Dispute already resolved.', HttpStatus.BAD_REQUEST);
    }

    const request = await this.repo.findById(dispute.requestId);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }

    let requestAction: 'refund' | 'resolve_close' = 'resolve_close';
    if (dto.resolutionType === 'refund_full' || dto.resolutionType === 'refund_partial') {
      requestAction = 'refund';
    } else if (dto.resolutionType === 'cancel_request' && dispute.paymentIntentId) {
      requestAction = 'refund';
    }

    if (requestAction === 'refund' && dispute.paymentIntentId) {
      await this.refunds.triggerRefund(dispute.paymentIntentId, user, {
        amount: dto.refundAmount,
        notes: dto.notes,
      });
    }

    const fromStatus = request.status;
    let toStatus = request.status;
    if (requestAction === 'refund') {
      toStatus = BreedingRequestStateMachine.assertTransition(fromStatus, 'refund');
    } else {
      toStatus = BreedingRequestStateMachine.assertTransition(fromStatus, 'resolve_close');
    }

    await this.repo.updateStatus(request.id, toStatus);
    const resolved = await this.repo.updateDispute(id, {
      status: 'resolved',
      resolutionCode: dto.resolutionCode,
      resolutionType: dto.resolutionType,
      resolvedAt: new Date().toISOString(),
      resolvedBy: user.id,
      metadata: { notes: dto.notes },
    });

    await this.audit.emit({
      action: 'dispute.resolved',
      actorId: user.id,
      subjectType: 'dispute',
      subjectId: id,
      metadata: {
        resolutionType: dto.resolutionType,
        resolutionCode: dto.resolutionCode,
      },
    });
    await this.audit.emit(
      breedingRequestStatusChangedEvent(user.id, request.id, fromStatus, toStatus, {
        disputeId: id,
      }),
    );
    await this.analytics.capture({
      event: 'dispute_resolved',
      accountId: user.id,
      properties: { disputeId: id, resolutionType: dto.resolutionType },
    });

    return { id, status: resolved!.status, requestStatus: toStatus };
  }

  private async requireActiveDispute(id: string): Promise<Dispute> {
    const dispute = await this.repo.findDisputeById(id);
    if (!dispute) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Dispute not found.', HttpStatus.NOT_FOUND);
    }
    if (dispute.status === 'resolved') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Dispute already resolved.', HttpStatus.BAD_REQUEST);
    }
    return dispute;
  }
}
