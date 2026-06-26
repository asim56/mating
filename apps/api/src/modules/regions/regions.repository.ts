import { Injectable } from '@nestjs/common';

import { REGION_DEFINITIONS, type RegionCode, type RegionConfig } from '@mating/shared';

import type { Region, RegionUpdate } from './entities/region.entity';

export const REGION_REPOSITORY = 'REGION_REPOSITORY';

/**
 * Persistence port for regions. The Supabase-backed implementation lands with
 * the database client in M1 (IDENTITY-01); until then {@link InMemoryRegionRepository}
 * serves the seeded canonical definitions so the endpoints are fully functional
 * and deterministic in tests.
 */
export interface RegionRepository {
  findAll(): Promise<Region[]>;
  findActive(): Promise<Region[]>;
  findByCode(code: string): Promise<Region | null>;
  update(code: string, patch: RegionUpdate): Promise<Region | null>;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function fromDefinition(code: RegionCode): Region {
  const def = REGION_DEFINITIONS[code];
  return {
    code: def.code,
    name: def.name,
    currencyCode: def.currencyCode,
    defaultLocale: def.defaultLocale,
    locales: clone(def.locales),
    active: def.active,
    config: clone(def.config),
  };
}

/**
 * In-memory region store seeded from the shared canonical definitions (the same
 * values inserted by `supabase/seed.sql`). State is process-local and resets on
 * restart — acceptable until the DB-backed repository replaces it.
 */
@Injectable()
export class InMemoryRegionRepository implements RegionRepository {
  private readonly store = new Map<string, Region>();

  constructor() {
    for (const code of Object.keys(REGION_DEFINITIONS) as RegionCode[]) {
      this.store.set(code, fromDefinition(code));
    }
  }

  async findAll(): Promise<Region[]> {
    return [...this.store.values()].map(clone);
  }

  async findActive(): Promise<Region[]> {
    return [...this.store.values()].filter((region) => region.active).map(clone);
  }

  async findByCode(code: string): Promise<Region | null> {
    const region = this.store.get(code);
    return region ? clone(region) : null;
  }

  async update(code: string, patch: RegionUpdate): Promise<Region | null> {
    const current = this.store.get(code);
    if (!current) {
      return null;
    }

    const mergedConfig: RegionConfig = patch.config
      ? { ...current.config, ...patch.config }
      : current.config;

    const updated: Region = {
      ...current,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.defaultLocale !== undefined ? { defaultLocale: patch.defaultLocale } : {}),
      ...(patch.locales !== undefined ? { locales: patch.locales } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      config: mergedConfig,
    };

    this.store.set(code, updated);
    return clone(updated);
  }
}
