import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { VERIFICATION_DIMENSIONS } from '@mating/shared';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import {
  verificationRequestSubmittedEvent,
  type VerificationAuditEvent,
} from './events/verification.events';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  InMemoryVerificationRequestsRepository,
} from './verification.repository';

@Injectable()
export class VerificationQueueService {
  constructor(
    @Inject(VERIFICATION_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryVerificationRequestsRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: VerificationAuditEvent): Promise<void> },
  ) {}

  async submit(
    dto: {
      subjectType: 'animal' | 'profile' | 'facility';
      subjectId: string;
      dimension: string;
      checklist?: Record<string, unknown>;
    },
    user: AuthenticatedUser,
  ) {
    if (!VERIFICATION_DIMENSIONS.includes(dto.dimension as never)) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid dimension.', HttpStatus.BAD_REQUEST);
    }

    if (dto.subjectType === 'animal') {
      const animal = await this.animals.findById(dto.subjectId);
      if (!animal) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Subject not found.', HttpStatus.NOT_FOUND);
      }
      if (animal.ownerId !== user.id) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not subject owner.', HttpStatus.FORBIDDEN);
      }
    }

    try {
      const created = await this.repo.create({
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        dimension: dto.dimension,
        requesterId: user.id,
        checklist: dto.checklist ?? {},
        notes: null,
      });
      await this.audit.emit(
        verificationRequestSubmittedEvent(user.id, created.id, {
          dimension: dto.dimension,
          subjectType: dto.subjectType,
        }),
      );
      return {
        id: created.id,
        status: created.status,
        dimension: created.dimension,
        subjectType: created.subjectType,
        subjectId: created.subjectId,
        createdAt: created.createdAt,
      };
    } catch (err) {
      if (err instanceof Error && err.message === 'DUPLICATE_PENDING') {
        throw new ApiError(
          ERROR_CODES.CONFLICT,
          'Duplicate pending request for dimension.',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async listMine(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: string; dimension?: string },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listForRequester(user.id, { ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async listAdmin(query: {
    status?: string;
    dimension?: string;
    subjectType?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listAdmin({ ...query, limit });
    const page = buildPage(rows, limit, (row) => row.createdAt);
    const data = await Promise.all(
      page.data.map(async (row) => ({
        id: row.id,
        dimension: row.dimension,
        subjectType: row.subjectType,
        subjectId: row.subjectId,
        requesterId: row.requesterId,
        status: row.status,
        createdAt: row.createdAt,
        subjectSummary: await this.subjectSummary(row.subjectType, row.subjectId),
      })),
    );
    return { data, meta: page.meta };
  }

  private async subjectSummary(subjectType: string, subjectId: string) {
    if (subjectType === 'animal') {
      const animal = await this.animals.findById(subjectId);
      return animal ? { name: animal.species, species: animal.species } : { name: 'unknown' };
    }
    return { name: 'unknown' };
  }
}
