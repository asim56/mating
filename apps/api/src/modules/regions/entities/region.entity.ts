import type { RegionCode, RegionConfig } from '@mating/shared';

/**
 * Domain representation of a `regions` row. Mirrors the Supabase table created in
 * `20250701000000_regions.sql` and the canonical definitions in
 * `@mating/shared` (config/eligibility).
 */
export type Region = {
  code: RegionCode;
  name: string;
  currencyCode: string;
  defaultLocale: string;
  locales: string[];
  active: boolean;
  config: RegionConfig;
};

/** Fields an admin may patch on a region. */
export type RegionUpdate = {
  name?: string;
  defaultLocale?: string;
  locales?: string[];
  active?: boolean;
  config?: Partial<RegionConfig>;
};

/**
 * Public-safe projection of a region: configuration (eligibility/compliance) is
 * intentionally omitted so it is never exposed on unauthenticated surfaces.
 */
export type RegionPublicView = {
  code: RegionCode;
  name: string;
  currencyCode: string;
  defaultLocale: string;
  locales: string[];
  paymentMethods: string[];
};

export function toPublicView(region: Region): RegionPublicView {
  return {
    code: region.code,
    name: region.name,
    currencyCode: region.currencyCode,
    defaultLocale: region.defaultLocale,
    locales: region.locales,
    paymentMethods: region.config.paymentMethods,
  };
}
