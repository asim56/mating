import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { AnimalMedia, AnimalMediaCreate } from './entities/animal.entity';

export const ANIMAL_MEDIA_REPOSITORY = 'ANIMAL_MEDIA_REPOSITORY';

@Injectable()
export class InMemoryAnimalMediaRepository {
  private readonly store = new Map<string, AnimalMedia>();

  async create(input: AnimalMediaCreate): Promise<AnimalMedia> {
    const row: AnimalMedia = {
      id: randomUUID(),
      animalId: input.animalId,
      storagePath: input.storagePath,
      mediaType: input.mediaType,
      visibility: 'private',
      sortOrder: input.sortOrder ?? 0,
      deletedAt: null,
    };
    this.store.set(row.id, row);
    return { ...row };
  }

  async listByAnimal(animalId: string): Promise<AnimalMedia[]> {
    return [...this.store.values()]
      .filter((m) => m.animalId === animalId && !m.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => ({ ...m }));
  }

  async countImages(animalId: string): Promise<number> {
    return [...this.store.values()].filter(
      (m) => m.animalId === animalId && !m.deletedAt && m.mediaType === 'image',
    ).length;
  }
}

export type AnimalMediaRepository = InMemoryAnimalMediaRepository;
