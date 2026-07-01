import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { VERIFICATION_DIMENSIONS, type VerificationDimensionMap } from '@mating/shared';

import { decodeCursor } from '../../common';
import type {
  Animal,
  AnimalCreate,
  AnimalUpdate,
  ListAnimalsFilter,
} from './entities/animal.entity';

export const ANIMALS_REPOSITORY = 'ANIMALS_REPOSITORY';

function defaultVerificationDimensions(): VerificationDimensionMap {
  return Object.fromEntries(
    VERIFICATION_DIMENSIONS.map((d) => [d, 'unverified' as const]),
  ) as VerificationDimensionMap;
}

function cloneAnimal(animal: Animal): Animal {
  return {
    ...animal,
    verificationDimensions: { ...animal.verificationDimensions },
  };
}

@Injectable()
export class InMemoryAnimalsRepository {
  private readonly animals = new Map<string, Animal>();

  async create(input: AnimalCreate): Promise<Animal> {
    const now = new Date().toISOString();
    const animal: Animal = {
      id: randomUUID(),
      ownerId: input.ownerId,
      regionCode: input.regionCode,
      regionId: input.regionId,
      species: input.species,
      breedId: input.breedId ?? null,
      name: input.name ?? null,
      tagNumber: input.tagNumber ?? null,
      sex: input.sex,
      dateOfBirth: input.dateOfBirth ?? null,
      approximateAgeMonths: input.approximateAgeMonths ?? null,
      weightKg: input.weightKg ?? null,
      color: input.color ?? null,
      description: input.description ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      city: input.city ?? null,
      provinceOrState: input.provinceOrState ?? null,
      countryCode: input.countryCode ?? null,
      breedingStatus: 'draft',
      healthStatus: 'unknown',
      ownerDeclaration: false,
      verificationDimensions: input.verificationDimensions,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.animals.set(animal.id, animal);
    return cloneAnimal(animal);
  }

  async findById(id: string): Promise<Animal | null> {
    const animal = this.animals.get(id);
    return animal ? cloneAnimal(animal) : null;
  }

  async update(id: string, patch: AnimalUpdate): Promise<Animal | null> {
    const current = this.animals.get(id);
    if (!current || current.deletedAt) {
      return null;
    }
    const updated: Animal = {
      ...current,
      ...(patch.breedId !== undefined ? { breedId: patch.breedId } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.tagNumber !== undefined ? { tagNumber: patch.tagNumber } : {}),
      ...(patch.sex !== undefined ? { sex: patch.sex } : {}),
      ...(patch.dateOfBirth !== undefined ? { dateOfBirth: patch.dateOfBirth } : {}),
      ...(patch.approximateAgeMonths !== undefined
        ? { approximateAgeMonths: patch.approximateAgeMonths }
        : {}),
      ...(patch.weightKg !== undefined ? { weightKg: patch.weightKg } : {}),
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.latitude !== undefined ? { latitude: patch.latitude } : {}),
      ...(patch.longitude !== undefined ? { longitude: patch.longitude } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.provinceOrState !== undefined ? { provinceOrState: patch.provinceOrState } : {}),
      ...(patch.countryCode !== undefined ? { countryCode: patch.countryCode } : {}),
      ...(patch.ownerDeclaration !== undefined ? { ownerDeclaration: patch.ownerDeclaration } : {}),
      ...(patch.healthStatus !== undefined ? { healthStatus: patch.healthStatus } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.animals.set(id, updated);
    return cloneAnimal(updated);
  }

  async setBreedingStatus(id: string, status: Animal['breedingStatus']): Promise<Animal | null> {
    const current = this.animals.get(id);
    if (!current || current.deletedAt) {
      return null;
    }
    const updated = { ...current, breedingStatus: status, updatedAt: new Date().toISOString() };
    this.animals.set(id, updated);
    return cloneAnimal(updated);
  }

  async softDelete(id: string): Promise<Animal | null> {
    const current = this.animals.get(id);
    if (!current || current.deletedAt) {
      return null;
    }
    const deletedAt = new Date().toISOString();
    const updated = { ...current, deletedAt, updatedAt: deletedAt };
    this.animals.set(id, updated);
    return cloneAnimal(updated);
  }

  async listByOwner(filter: ListAnimalsFilter): Promise<Animal[]> {
    let rows = [...this.animals.values()].filter((a) => a.ownerId === filter.ownerId);
    if (!filter.includeDeleted) {
      rows = rows.filter((a) => !a.deletedAt);
    }
    if (filter.breedingStatus) {
      rows = rows.filter((a) => a.breedingStatus === filter.breedingStatus);
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((a) => a.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1).map(cloneAnimal);
  }

  /** Test helper: seed verification dimensions default on create if missing. */
  static createVerificationDimensions(): VerificationDimensionMap {
    return defaultVerificationDimensions();
  }
}

export type AnimalsRepository = InMemoryAnimalsRepository;
