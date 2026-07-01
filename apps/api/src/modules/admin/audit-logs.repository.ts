import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { decodeCursor } from '../../common';

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  subjectType: string;
  subjectId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogQuery = {
  actorId?: string;
  subjectType?: string;
  subjectId?: string;
  action?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit: number;
};

export const AUDIT_LOGS_QUERY_REPOSITORY = 'AUDIT_LOGS_QUERY_REPOSITORY';

@Injectable()
export class InMemoryAuditLogsQueryRepository {
  private readonly logs: AuditLogEntry[] = [];

  async insert(input: Omit<AuditLogEntry, 'id' | 'createdAt'>): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.logs.push(entry);
    return { ...entry };
  }

  async findById(id: string): Promise<AuditLogEntry | null> {
    const row = this.logs.find((l) => l.id === id);
    return row ? { ...row, metadata: { ...row.metadata } } : null;
  }

  async query(filter: AuditLogQuery): Promise<AuditLogEntry[]> {
    let rows = [...this.logs];
    if (filter.actorId) rows = rows.filter((r) => r.actorId === filter.actorId);
    if (filter.subjectType) rows = rows.filter((r) => r.subjectType === filter.subjectType);
    if (filter.subjectId) rows = rows.filter((r) => r.subjectId === filter.subjectId);
    if (filter.action) {
      rows = rows.filter(
        (r) => r.action === filter.action || r.action.startsWith(`${filter.action}`),
      );
    }
    if (filter.from) rows = rows.filter((r) => r.createdAt >= filter.from!);
    if (filter.to) rows = rows.filter((r) => r.createdAt <= filter.to!);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1).map((r) => ({
      ...r,
      metadata: { ...r.metadata },
    }));
  }

  /** Test helper: seed audit entries. */
  seed(entries: Omit<AuditLogEntry, 'id' | 'createdAt'>[]): void {
    for (const entry of entries) {
      this.logs.push({
        ...entry,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      });
    }
  }
}
