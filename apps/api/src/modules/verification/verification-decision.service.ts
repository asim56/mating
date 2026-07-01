import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import {
  assertVerificationDecisionRole,
  assertVerificationDimensionAccess,
} from './guards/verification-dimension.guard';
import {
  verificationApprovedEvent,
  verificationRejectedEvent,
  type VerificationAuditEvent,
} from './events/verification.events';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  InMemoryVerificationRequestsRepository,
} from './verification.repository';

@Injectable()
export class VerificationDecisionService {
  constructor(
    @Inject(VERIFICATION_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryVerificationRequestsRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: VerificationAuditEvent): Promise<void> },
    private readonly analytics: AnalyticsService,
  ) {}

  async approve(id: string, user: AuthenticatedUser, notes?: string) {
    assertVerificationDecisionRole(user);
    const request = await this.repo.findById(id);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    if (request.status !== 'pending') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request not pending.', HttpStatus.BAD_REQUEST);
    }
    assertVerificationDimensionAccess(user, request.dimension);

    const updated = await this.repo.updateDecision(id, {
      status: 'approved',
      reviewerId: user.id,
      notes: notes ?? null,
    });
    await this.applyDimensionStatus(request, 'approved');
    await this.audit.emit(
      verificationApprovedEvent(user.id, id, {
        dimension: request.dimension,
        subjectType: request.subjectType,
        subjectId: request.subjectId,
      }),
    );
    await this.analytics.capture({
      event: 'verification_approved',
      accountId: user.id,
      properties: { dimension: request.dimension, requestId: id },
    });

    return this.toResponse(updated!);
  }

  async reject(id: string, user: AuthenticatedUser, notes: string) {
    assertVerificationDecisionRole(user);
    const request = await this.repo.findById(id);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    if (request.status !== 'pending') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request not pending.', HttpStatus.BAD_REQUEST);
    }
    assertVerificationDimensionAccess(user, request.dimension);

    const updated = await this.repo.updateDecision(id, {
      status: 'rejected',
      reviewerId: user.id,
      notes,
    });
    await this.applyDimensionStatus(request, 'rejected');
    await this.audit.emit(
      verificationRejectedEvent(user.id, id, {
        dimension: request.dimension,
        subjectType: request.subjectType,
        subjectId: request.subjectId,
        notes,
      }),
    );

    return this.toResponse(updated!);
  }

  private async applyDimensionStatus(
    request: { subjectType: string; subjectId: string; dimension: string },
    status: 'approved' | 'rejected',
  ) {
    if (request.subjectType === 'animal') {
      const animal = await this.animals.findById(request.subjectId);
      if (!animal) return;
      await this.animals.update(request.subjectId, {
        verificationDimensions: {
          ...animal.verificationDimensions,
          [request.dimension]: status,
        },
      });
    }
  }

  private toResponse(row: {
    id: string;
    status: string;
    dimension: string;
    subjectType: string;
    subjectId: string;
    updatedAt: string;
  }) {
    return {
      id: row.id,
      status: row.status,
      dimension: row.dimension,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      decidedAt: row.updatedAt,
    };
  }
}
