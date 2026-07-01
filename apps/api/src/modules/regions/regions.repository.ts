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

/** Supabase-backed region repository (service-role bypasses RLS). */
@Injectable()
export class SupabaseRegionRepository implements RegionRepository {
  constructor(private readonly supabase: import('../../infra/supabase/supabase.service').SupabaseService) {}

  async findAll(): Promise<Region[]> {
    const { data, error } = await this.supabase.client.from('regions').select('*');
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => this.mapRow(row));
  }

  async findActive(): Promise<Region[]> {
    const { data, error } = await this.supabase.client.from('regions').select('*').eq('active', true);
    if (error) {
      throw new Error(error.message);
    }
    return (data ?? []).map((row) => this.mapRow(row));
  }

  async findByCode(code: string): Promise<Region | null> {
    const { data, error } = await this.supabase.client
      .from('regions')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? this.mapRow(data) : null;
  }

  async update(code: string, patch: RegionUpdate): Promise<Region | null> {
    const current = await this.findByCode(code);
    if (!current) {
      return null;
    }
    const mergedConfig: RegionConfig = patch.config
      ? { ...current.config, ...patch.config }
      : current.config;
    const { data, error } = await this.supabase.client
      .from('regions')
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.defaultLocale !== undefined ? { default_locale: patch.defaultLocale } : {}),
        ...(patch.locales !== undefined ? { locales: patch.locales } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
        config: mergedConfig,
      })
      .eq('code', code)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return this.mapRow(data);
  }

  private mapRow(row: Record<string, unknown>): Region {
    return {
      code: row.code as RegionCode,
      name: row.name as string,
      currencyCode: row.currency_code as string,
      defaultLocale: row.default_locale as string,
      locales: row.locales as string[],
      active: row.active as boolean,
      config: row.config as RegionConfig,
    };
  }
}
