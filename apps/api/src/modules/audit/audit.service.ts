import { Injectable } from '@nestjs/common';

import type { AuditEvent, AuditEmitter } from '../regions/events/region-updated.event';
import { AuditRepository } from './audit.repository';

export const AUDIT_EMITTER = 'AUDIT_EMITTER';

@Injectable()
export class AuditService implements AuditEmitter {
  constructor(private readonly repo: AuditRepository) {}

  async emit(event: AuditEvent): Promise<void> {
    await this.repo.insert({
      actor_id: event.actorId,
      subject_id: event.subjectId,
      action: event.action,
      context: {
        subjectType: event.subjectType,
        ...(event.metadata ?? {}),
      },
    });
  }
}
