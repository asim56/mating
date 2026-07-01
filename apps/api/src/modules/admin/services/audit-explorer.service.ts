import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../../common';
import { AUDIT_EMITTER } from '../../audit/audit.service';
import {
  AUDIT_LOGS_QUERY_REPOSITORY,
  type InMemoryAuditLogsQueryRepository,
} from '../audit-logs.repository';
import type { AuditQueryDto } from '../dto/audit-query.dto';
import { AuditRedactionService } from './audit-redaction.service';

export type AuditExplorerAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

function auditQueriedEvent(
  actorId: string,
  filters: Record<string, unknown>,
): AuditExplorerAuditEvent {
  return {
    action: 'admin.audit_queried',
    actorId,
    subjectType: 'audit_query',
    subjectId: actorId,
    metadata: { filters },
  };
}

@Injectable()
export class AuditExplorerService {
  private readonly redaction = new AuditRedactionService();

  constructor(
    @Inject(AUDIT_LOGS_QUERY_REPOSITORY)
    private readonly repo: InMemoryAuditLogsQueryRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: AuditExplorerAuditEvent): Promise<void> },
  ) {}

  async query(user: AuthenticatedUser, dto: AuditQueryDto) {
    const limit = clampLimit(dto.limit);
    const rows = await this.repo.query({ ...dto, limit });
    const page = buildPage(rows, limit, (row) => row.createdAt);

    const isSupportOnly =
      user.roles.includes('support_agent') && !user.roles.includes('super_admin');

    const data = page.data.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      action: row.action,
      metadata: this.redaction.redactMetadata(row.metadata),
      createdAt: row.createdAt,
      ...(isSupportOnly && this.redaction.isSensitiveAction(row.action)
        ? { restricted: true }
        : {}),
    }));

    await this.audit.emit(
      auditQueriedEvent(user.id, {
        actorId: dto.actorId,
        subjectType: dto.subjectType,
        action: dto.action,
      }),
    );

    return { data, meta: page.meta };
  }

  async getById(user: AuthenticatedUser, id: string) {
    const row = await this.repo.findById(id);
    if (!row) {
      return null;
    }
    const isSupportOnly =
      user.roles.includes('support_agent') && !user.roles.includes('super_admin');
    if (isSupportOnly && this.redaction.isSensitiveAction(row.action)) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Sensitive audit entry.', HttpStatus.FORBIDDEN);
    }
    return {
      id: row.id,
      actorId: row.actorId,
      subjectType: row.subjectType,
      subjectId: row.subjectId,
      action: row.action,
      metadata: this.redaction.redactMetadata(row.metadata),
      createdAt: row.createdAt,
    };
  }
}
