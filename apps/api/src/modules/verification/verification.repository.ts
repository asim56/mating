import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { decodeCursor } from '../../common';

export type VerificationRequest = {
  id: string;
  subjectType: 'animal' | 'profile' | 'facility';
  subjectId: string;
  dimension: string;
  requesterId: string;
  reviewerId: string | null;
  status: 'pending' | 'approved' | 'rejected';
  checklist: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const VERIFICATION_REQUESTS_REPOSITORY = 'VERIFICATION_REQUESTS_REPOSITORY';

@Injectable()
export class InMemoryVerificationRequestsRepository {
  private readonly requests = new Map<string, VerificationRequest>();

  async create(
    input: Omit<VerificationRequest, 'id' | 'createdAt' | 'updatedAt' | 'reviewerId' | 'status'>,
  ): Promise<VerificationRequest> {
    const pending = await this.findPending(input.subjectType, input.subjectId, input.dimension);
    if (pending) {
      throw new Error('DUPLICATE_PENDING');
    }
    const now = new Date().toISOString();
    const row: VerificationRequest = {
      ...input,
      id: randomUUID(),
      reviewerId: null,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(row.id, row);
    return row;
  }

  async findPending(
    subjectType: string,
    subjectId: string,
    dimension: string,
  ): Promise<VerificationRequest | null> {
    for (const row of this.requests.values()) {
      if (
        row.status === 'pending' &&
        row.subjectType === subjectType &&
        row.subjectId === subjectId &&
        row.dimension === dimension
      ) {
        return row;
      }
    }
    return null;
  }

  async listForRequester(
    requesterId: string,
    filter: { status?: string; dimension?: string; cursor?: string; limit: number },
  ): Promise<VerificationRequest[]> {
    let rows = [...this.requests.values()].filter((r) => r.requesterId === requesterId);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    if (filter.dimension) rows = rows.filter((r) => r.dimension === filter.dimension);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async findById(id: string): Promise<VerificationRequest | null> {
    const row = this.requests.get(id);
    return row ? { ...row, checklist: { ...row.checklist } } : null;
  }

  async updateDecision(
    id: string,
    patch: {
      status: 'approved' | 'rejected';
      reviewerId: string;
      notes: string | null;
    },
  ): Promise<VerificationRequest | null> {
    const current = this.requests.get(id);
    if (!current) return null;
    const now = new Date().toISOString();
    const updated: VerificationRequest = {
      ...current,
      status: patch.status,
      reviewerId: patch.reviewerId,
      notes: patch.notes,
      updatedAt: now,
    };
    this.requests.set(id, updated);
    return { ...updated, checklist: { ...updated.checklist } };
  }

  async countByStatus(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const row of this.requests.values()) {
      counts[row.status] = (counts[row.status] ?? 0) + 1;
    }
    return counts;
  }

  async listAdmin(filter: {
    status?: string;
    dimension?: string;
    subjectType?: string;
    cursor?: string;
    limit: number;
  }): Promise<VerificationRequest[]> {
    let rows = [...this.requests.values()];
    const status = filter.status ?? 'pending';
    rows = rows.filter((r) => r.status === status);
    if (filter.dimension) rows = rows.filter((r) => r.dimension === filter.dimension);
    if (filter.subjectType) rows = rows.filter((r) => r.subjectType === filter.subjectType);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }
}
