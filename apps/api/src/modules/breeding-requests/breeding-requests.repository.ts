import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { decodeCursor } from '../../common';
import type {
  BreedingRecord,
  BreedingRequest,
  BreedingRequestCreate,
  BreedingRequestEvent,
  Dispute,
  ListBreedingRequestsFilter,
} from './entities/breeding-request.entity';
import type { BreedingRequestStatus } from '@mating/shared';

export const BREEDING_REQUESTS_REPOSITORY = 'BREEDING_REQUESTS_REPOSITORY';

function cloneRequest(r: BreedingRequest): BreedingRequest {
  return {
    ...r,
    locationDetails: { ...r.locationDetails },
    metadata: { ...r.metadata },
  };
}

@Injectable()
export class InMemoryBreedingRequestsRepository {
  private readonly requests = new Map<string, BreedingRequest>();
  private readonly events = new Map<string, BreedingRequestEvent[]>();
  private readonly records = new Map<string, BreedingRecord>();
  private readonly disputes = new Map<string, Dispute>();

  async create(input: BreedingRequestCreate): Promise<BreedingRequest> {
    const now = new Date().toISOString();
    const request: BreedingRequest = {
      id: randomUUID(),
      requesterId: input.requesterId,
      recipientId: input.recipientId,
      requesterAnimalId: input.requesterAnimalId,
      recipientAnimalId: input.recipientAnimalId,
      listingId: input.listingId ?? null,
      status: 'Requested',
      breedingMethod: input.breedingMethod,
      proposedAt: input.proposedAt ?? null,
      scheduledAt: null,
      completedAt: null,
      locationType: input.locationType ?? null,
      locationDetails: input.locationDetails ?? {},
      feeAmount: null,
      currencyCode: input.currencyCode,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.requests.set(request.id, request);
    return cloneRequest(request);
  }

  async findById(id: string): Promise<BreedingRequest | null> {
    const row = this.requests.get(id);
    return row && !row.deletedAt ? cloneRequest(row) : null;
  }

  async updateStatus(
    id: string,
    status: BreedingRequestStatus,
    patch?: Partial<Pick<BreedingRequest, 'scheduledAt' | 'completedAt' | 'locationType' | 'locationDetails' | 'metadata'>>,
  ): Promise<BreedingRequest | null> {
    const current = this.requests.get(id);
    if (!current || current.deletedAt) return null;
    const updated: BreedingRequest = {
      ...current,
      status,
      ...(patch?.scheduledAt !== undefined ? { scheduledAt: patch.scheduledAt } : {}),
      ...(patch?.completedAt !== undefined ? { completedAt: patch.completedAt } : {}),
      ...(patch?.locationType !== undefined ? { locationType: patch.locationType } : {}),
      ...(patch?.locationDetails !== undefined
        ? { locationDetails: patch.locationDetails }
        : {}),
      ...(patch?.metadata !== undefined
        ? { metadata: { ...current.metadata, ...patch.metadata } }
        : {}),
      updatedAt: new Date().toISOString(),
      ...(status === 'Cancelled' ? { deletedAt: new Date().toISOString() } : {}),
    };
    this.requests.set(id, updated);
    return cloneRequest(updated);
  }

  async listForUser(filter: ListBreedingRequestsFilter): Promise<BreedingRequest[]> {
    let rows = [...this.requests.values()].filter((r) => !r.deletedAt);
    if (filter.role === 'requester') {
      rows = rows.filter((r) => r.requesterId === filter.userId);
    } else if (filter.role === 'recipient') {
      rows = rows.filter((r) => r.recipientId === filter.userId);
    } else {
      rows = rows.filter(
        (r) => r.requesterId === filter.userId || r.recipientId === filter.userId,
      );
    }
    if (filter.status) {
      rows = rows.filter((r) => r.status === filter.status);
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1).map(cloneRequest);
  }

  async listOpenByPair(
    listingId: string | null,
    requesterAnimalId: string,
    recipientAnimalId: string,
  ): Promise<BreedingRequest[]> {
    return [...this.requests.values()]
      .filter(
        (r) =>
          !r.deletedAt &&
          r.listingId === listingId &&
          r.requesterAnimalId === requesterAnimalId &&
          r.recipientAnimalId === recipientAnimalId,
      )
      .map(cloneRequest);
  }

  async insertEvent(
    input: Omit<BreedingRequestEvent, 'id' | 'createdAt'>,
  ): Promise<BreedingRequestEvent> {
    const event: BreedingRequestEvent = {
      id: randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    };
    const list = this.events.get(input.requestId) ?? [];
    list.push(event);
    this.events.set(input.requestId, list);
    return { ...event };
  }

  async listEvents(requestId: string): Promise<BreedingRequestEvent[]> {
    return [...(this.events.get(requestId) ?? [])];
  }

  async upsertRecord(
    input: Omit<BreedingRecord, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<{ record: BreedingRecord; created: boolean }> {
    const existing = [...this.records.values()].find((r) => r.requestId === input.requestId);
    if (existing) {
      return { record: { ...existing }, created: false };
    }
    const now = new Date().toISOString();
    const record: BreedingRecord = {
      id: randomUUID(),
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(record.id, record);
    return { record: { ...record }, created: true };
  }

  async findRecordByRequestId(requestId: string): Promise<BreedingRecord | null> {
    const match = [...this.records.values()].find((r) => r.requestId === requestId);
    return match ? { ...match } : null;
  }

  async createDispute(input: {
    requestId: string;
    openedBy: string;
    reasonCode: string;
    description: string | null;
  }): Promise<Dispute> {
    const now = new Date().toISOString();
    const dispute: Dispute = {
      id: randomUUID(),
      requestId: input.requestId,
      openedBy: input.openedBy,
      status: 'open',
      reasonCode: input.reasonCode,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    this.disputes.set(dispute.id, dispute);
    return { ...dispute };
  }

  async findOpenDisputeByRequestId(requestId: string): Promise<Dispute | null> {
    const match = [...this.disputes.values()].find(
      (d) => d.requestId === requestId && d.status === 'open',
    );
    return match ? { ...match } : null;
  }

  async findDisputeById(id: string): Promise<Dispute | null> {
    const row = this.disputes.get(id);
    return row ? { ...row } : null;
  }
}
