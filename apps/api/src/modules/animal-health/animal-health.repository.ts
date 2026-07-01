import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { HealthRecord, HealthRecordCreate } from './entities/health-record.entity';

export const ANIMAL_HEALTH_REPOSITORY = 'ANIMAL_HEALTH_REPOSITORY';

@Injectable()
export class InMemoryAnimalHealthRepository {
  private readonly store = new Map<string, HealthRecord>();

  async create(input: HealthRecordCreate): Promise<HealthRecord> {
    const now = new Date().toISOString();
    const row: HealthRecord = {
      id: randomUUID(),
      animalId: input.animalId,
      veterinarianId: input.veterinarianId ?? null,
      recordType: input.recordType,
      title: input.title,
      recordDate: input.recordDate,
      expiresAt: input.expiresAt ?? null,
      status: 'submitted',
      storagePath: input.storagePath ?? null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(row.id, row);
    return { ...row };
  }

  async listByAnimal(animalId: string): Promise<HealthRecord[]> {
    return [...this.store.values()]
      .filter((r) => r.animalId === animalId)
      .map((r) => ({ ...r }));
  }
}

export type AnimalHealthRepository = InMemoryAnimalHealthRepository;
