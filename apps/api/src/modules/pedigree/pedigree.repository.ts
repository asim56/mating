import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { PedigreeCreate, PedigreeRecord } from './entities/pedigree-record.entity';

export const PEDIGREE_REPOSITORY = 'PEDIGREE_REPOSITORY';

@Injectable()
export class InMemoryPedigreeRepository {
  private readonly store = new Map<string, PedigreeRecord>();

  async create(input: PedigreeCreate): Promise<PedigreeRecord> {
    const now = new Date().toISOString();
    const row: PedigreeRecord = {
      id: randomUUID(),
      animalId: input.animalId,
      sireAnimalId: input.sireAnimalId ?? null,
      damAnimalId: input.damAnimalId ?? null,
      registryName: input.registryName ?? null,
      registryNumber: input.registryNumber ?? null,
      documentPath: input.documentPath ?? null,
      verificationStatus: 'unverified',
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(row.id, row);
    return { ...row };
  }

  async listByAnimal(animalId: string): Promise<PedigreeRecord[]> {
    return [...this.store.values()]
      .filter((r) => r.animalId === animalId)
      .map((r) => ({ ...r }));
  }
}

export type PedigreeRepository = InMemoryPedigreeRepository;
