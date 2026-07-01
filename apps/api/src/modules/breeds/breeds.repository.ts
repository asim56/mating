import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { BREED_DEFINITIONS, type RegionCode, type Species } from '@mating/shared';

import type { Breed, BreedCreate, BreedUpdate } from './entities/breed.entity';

export const BREED_REPOSITORY = 'BREED_REPOSITORY';

/**
 * Persistence port for breeds. The Supabase-backed implementation lands with the
 * database client in M1 (IDENTITY-01); until then {@link InMemoryBreedRepository}
 * serves the seeded canonical taxonomy so the endpoints are fully functional and
 * deterministic in tests.
 */
export interface BreedRepository {
  findAll(): Promise<Breed[]>;
  findActive(filter?: BreedFilter): Promise<Breed[]>;
  findById(id: string): Promise<Breed | null>;
  /** Existing breed matching the natural key, used to enforce uniqueness. */
  findByNaturalKey(regionCode: RegionCode, species: Species, name: string): Promise<Breed | null>;
  create(input: BreedCreate): Promise<Breed>;
  update(id: string, patch: BreedUpdate): Promise<Breed | null>;
}

/** Optional read filters for public breed listings. */
export type BreedFilter = {
  regionCode?: RegionCode;
  species?: Species;
};

function clone(breed: Breed): Breed {
  return { ...breed };
}

function naturalKey(regionCode: string, species: string, name: string): string {
  return `${regionCode}::${species}::${name.toLowerCase()}`;
}

/**
 * In-memory breed store seeded from the shared canonical definitions (the same
 * values inserted by `supabase/seed.sql`). State is process-local and resets on
 * restart — acceptable until the DB-backed repository replaces it.
 */
@Injectable()
export class InMemoryBreedRepository implements BreedRepository {
  private readonly store = new Map<string, Breed>();

  constructor() {
    for (const def of BREED_DEFINITIONS) {
      const breed: Breed = {
        id: randomUUID(),
        regionCode: def.regionCode,
        species: def.species,
        name: def.name,
        description: def.description,
        active: def.active,
      };
      this.store.set(breed.id, breed);
    }
  }

  async findAll(): Promise<Breed[]> {
    return [...this.store.values()].map(clone);
  }

  async findActive(filter?: BreedFilter): Promise<Breed[]> {
    return [...this.store.values()]
      .filter((breed) => breed.active)
      .filter((breed) => !filter?.regionCode || breed.regionCode === filter.regionCode)
      .filter((breed) => !filter?.species || breed.species === filter.species)
      .map(clone);
  }

  async findById(id: string): Promise<Breed | null> {
    const breed = this.store.get(id);
    return breed ? clone(breed) : null;
  }

  async findByNaturalKey(
    regionCode: RegionCode,
    species: Species,
    name: string,
  ): Promise<Breed | null> {
    const key = naturalKey(regionCode, species, name);
    const match = [...this.store.values()].find(
      (breed) => naturalKey(breed.regionCode, breed.species, breed.name) === key,
    );
    return match ? clone(match) : null;
  }

  async create(input: BreedCreate): Promise<Breed> {
    const breed: Breed = {
      id: randomUUID(),
      regionCode: input.regionCode,
      species: input.species,
      name: input.name,
      description: input.description ?? null,
      active: input.active ?? true,
    };
    this.store.set(breed.id, breed);
    return clone(breed);
  }

  async update(id: string, patch: BreedUpdate): Promise<Breed | null> {
    const current = this.store.get(id);
    if (!current) {
      return null;
    }

    const updated: Breed = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    };

    this.store.set(id, updated);
    return clone(updated);
  }
}
