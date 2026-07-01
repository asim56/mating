import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  REVIEW_EDIT_WINDOW_HOURS,
  REVIEW_WINDOW_DAYS,
  type ReviewStatus,
} from '@mating/shared';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from '../breeding-requests/breeding-requests.repository';
import { assertParticipant } from '../breeding-requests/policies/breeding-request.policy';
import { REVIEWS_REPOSITORY, InMemoryReviewsRepository } from './reviews.repository';

const ELIGIBLE_STATUSES = new Set(['Completed', 'Closed', 'RecordGenerated']);

export type ReviewAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(REVIEWS_REPOSITORY) private readonly repo: InMemoryReviewsRepository,
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breeding: InMemoryBreedingRequestsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: ReviewAuditEvent): Promise<void> },
  ) {}

  async create(
    dto: {
      requestId: string;
      subjectUserId: string;
      subjectAnimalId?: string;
      rating: number;
      title?: string;
      body?: string;
    },
    user: AuthenticatedUser,
  ) {
    const request = await this.breeding.findById(dto.requestId);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }
    assertParticipant(request, user);
    if (!ELIGIBLE_STATUSES.has(request.status)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request not eligible.', HttpStatus.BAD_REQUEST);
    }
    if (!request.completedAt) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Request not completed.', HttpStatus.BAD_REQUEST);
    }
    const windowEnd = new Date(request.completedAt);
    windowEnd.setDate(windowEnd.getDate() + REVIEW_WINDOW_DAYS);
    if (new Date() > windowEnd) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Review window expired.', HttpStatus.BAD_REQUEST);
    }

    const dispute = await this.breeding.findOpenDisputeByRequestId(dto.requestId);
    const isDisputeInfluenced = dispute !== null;
    const status: ReviewStatus = isDisputeInfluenced ? 'flagged' : 'published';

    try {
      const created = await this.repo.create({
        requestId: dto.requestId,
        reviewerId: user.id,
        subjectUserId: dto.subjectUserId,
        subjectAnimalId: dto.subjectAnimalId,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        status,
        isDisputeInfluenced,
      });
      await this.audit.emit({
        action: 'review.created',
        actorId: user.id,
        subjectType: 'review',
        subjectId: created.id,
        metadata: { requestId: dto.requestId, status },
      });
      return created;
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_REVIEW') {
        throw new ApiError(ERROR_CODES.CONFLICT, 'Duplicate review.', HttpStatus.CONFLICT);
      }
      throw err;
    }
  }

  async update(
    id: string,
    dto: { rating?: number; title?: string; body?: string },
    user: AuthenticatedUser,
  ) {
    const review = await this.repo.findById(id);
    if (!review) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Review not found.', HttpStatus.NOT_FOUND);
    }
    if (review.reviewerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not reviewer.', HttpStatus.FORBIDDEN);
    }
    const editDeadline = new Date(review.createdAt);
    editDeadline.setHours(editDeadline.getHours() + REVIEW_EDIT_WINDOW_HOURS);
    if (new Date() > editDeadline) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Edit window expired.', HttpStatus.FORBIDDEN);
    }
    const updated = await this.repo.update(id, dto);
    return updated!;
  }

  async listPublic(query: {
    subjectUserId?: string;
    subjectAnimalId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listBySubject({ ...query, status: 'published', limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async listAdmin(query: { status?: ReviewStatus; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listAdmin({ ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async moderate(
    id: string,
    admin: AuthenticatedUser,
    action: 'approve' | 'hide',
    notes?: string,
  ) {
    const review = await this.repo.findById(id);
    if (!review) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Review not found.', HttpStatus.NOT_FOUND);
    }
    const status: ReviewStatus = action === 'hide' ? 'hidden' : 'published';
    const updated = await this.repo.update(id, {
      status,
      moderatedBy: admin.id,
      moderatedAt: new Date().toISOString(),
    });
    await this.audit.emit({
      action: action === 'hide' ? 'review.hidden' : 'review.moderated',
      actorId: admin.id,
      subjectType: 'review',
      subjectId: id,
      metadata: { notes, status },
    });
    return { id, status: updated!.status };
  }
}
