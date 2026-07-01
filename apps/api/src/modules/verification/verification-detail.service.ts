import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { canApproveVerificationDimension } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import { adminDocumentAccessedEvent, type VerificationAuditEvent } from './events/verification.events';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  InMemoryVerificationRequestsRepository,
} from './verification.repository';

@Injectable()
export class VerificationDetailService {
  constructor(
    @Inject(VERIFICATION_REQUESTS_REPOSITORY)
    private readonly repo: InMemoryVerificationRequestsRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: VerificationAuditEvent): Promise<void> },
  ) {}

  async getById(id: string, user: AuthenticatedUser) {
    const request = await this.repo.findById(id);
    if (!request) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
    }

    const isAdmin = user.roles.some((r) =>
      ['super_admin', 'support_agent', 'veterinarian', 'inspector'].includes(r),
    );
    if (!isAdmin) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }

    const canReadDimension =
      user.roles.includes('super_admin') ||
      user.roles.includes('support_agent') ||
      canApproveVerificationDimension(user.roles, request.dimension);

    if (!canReadDimension) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Dimension out of scope.', HttpStatus.FORBIDDEN);
    }

    const evidenceUrls = this.mintEvidenceUrls(request.checklist);
    if (evidenceUrls.length > 0) {
      await this.audit.emit(
        adminDocumentAccessedEvent(user.id, request.subjectType, request.subjectId, {
          document_path_hash: `verification:${request.id}`,
        }),
      );
    }

    return {
      ...request,
      subjectSummary: await this.subjectSummary(request.subjectType, request.subjectId),
      evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
    };
  }

  private mintEvidenceUrls(checklist: Record<string, unknown>): string[] {
    const paths: string[] = [];
    for (const value of Object.values(checklist)) {
      if (typeof value === 'string' && value.startsWith('verification-evidence/')) {
        paths.push(`https://signed.example/${value}?exp=${Date.now() + 15 * 60 * 1000}`);
      }
    }
    return paths;
  }

  private async subjectSummary(subjectType: string, subjectId: string) {
    if (subjectType === 'animal') {
      const animal = await this.animals.findById(subjectId);
      return animal ? { name: animal.species, species: animal.species } : { name: 'unknown' };
    }
    return { name: 'unknown' };
  }
}
