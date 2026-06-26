import { REGIONS } from '../constants';
import type { RegionCode } from '../types';

/**
 * Canonical region configuration for `config/regions` (M1).
 *
 * This module is the single source of truth for the seeded `regions.config`
 * payload: the same values are inserted by `supabase/seed.sql` and served by the
 * API's in-memory region repository until the database client lands. Keeping the
 * defaults here lets every layer (seed, API, tests) read identical, typed values
 * and prevents the eligibility/compliance config from drifting between layers.
 */

/** Minimum breeding-eligibility rules for a single species within a region. */
export type SpeciesEligibility = {
  /** Minimum age in months before an animal of this species is breeding-eligible. */
  minAgeMonths: number;
  /** A current clinical/health record is required before requests are allowed. */
  requiresHealthCheck: boolean;
  /** Up-to-date vaccination is required before requests are allowed. */
  requiresVaccination: boolean;
};

/** Eligibility configuration: per-species rules plus conservative fallbacks. */
export type RegionEligibilityConfig = {
  /** Per-species breeding rules keyed by species code (e.g. `cattle`). */
  species: Record<string, SpeciesEligibility>;
  /** Applied to any species without an explicit entry above. */
  defaults: SpeciesEligibility;
};

/** Region compliance + provincial/state policy flags. */
export type RegionComplianceConfig = {
  /** Administrative subdivisions (provinces/territories or states). */
  subdivisions: string[];
  /** Exotic/non-priority species require admin category approval to list. */
  exoticRequiresApproval: boolean;
  /** KYC is required before a user can transact (pay/receive). */
  kycRequiredForPayments: boolean;
};

/** Full `regions.config` jsonb payload. */
export type RegionConfig = {
  eligibility: RegionEligibilityConfig;
  compliance: RegionComplianceConfig;
  /** Supported payment method identifiers for the region. */
  paymentMethods: string[];
};

/** A complete region definition (row shape + config payload). */
export type RegionDefinition = {
  code: RegionCode;
  name: string;
  currencyCode: string;
  defaultLocale: string;
  /** All locales offered in the region (default first). */
  locales: string[];
  active: boolean;
  config: RegionConfig;
};

const PK_SPECIES_ELIGIBILITY: Record<string, SpeciesEligibility> = {
  // Conservative minimums (months) chosen to err on the side of animal welfare;
  // refined with domain input per the ImplementationPlan eligibility note.
  cattle: { minAgeMonths: 18, requiresHealthCheck: true, requiresVaccination: true },
  buffalo: { minAgeMonths: 24, requiresHealthCheck: true, requiresVaccination: true },
  goat: { minAgeMonths: 12, requiresHealthCheck: true, requiresVaccination: true },
  sheep: { minAgeMonths: 12, requiresHealthCheck: true, requiresVaccination: true },
  dog: { minAgeMonths: 18, requiresHealthCheck: true, requiresVaccination: true },
};

const US_SPECIES_ELIGIBILITY: Record<string, SpeciesEligibility> = {
  cattle: { minAgeMonths: 15, requiresHealthCheck: true, requiresVaccination: true },
  dog: { minAgeMonths: 24, requiresHealthCheck: true, requiresVaccination: true },
};

const CONSERVATIVE_DEFAULT: SpeciesEligibility = {
  minAgeMonths: 12,
  requiresHealthCheck: true,
  requiresVaccination: true,
};

/**
 * Canonical, seeded region definitions. PK launches first (PKR, en/ur,
 * Easypaisa/JazzCash/bank); US is staged for Phase 3 (USD, en, Stripe) and
 * seeded inactive so it never surfaces in the Pakistan MVP.
 */
export const REGION_DEFINITIONS: Record<RegionCode, RegionDefinition> = {
  PK: {
    code: 'PK',
    name: 'Pakistan',
    currencyCode: REGIONS.PK.currency,
    defaultLocale: REGIONS.PK.defaultLocale,
    locales: ['en', 'ur'],
    active: true,
    config: {
      eligibility: { species: PK_SPECIES_ELIGIBILITY, defaults: CONSERVATIVE_DEFAULT },
      compliance: {
        subdivisions: [
          'Punjab',
          'Sindh',
          'Khyber Pakhtunkhwa',
          'Balochistan',
          'Gilgit-Baltistan',
          'Azad Jammu and Kashmir',
          'Islamabad Capital Territory',
        ],
        exoticRequiresApproval: true,
        kycRequiredForPayments: true,
      },
      paymentMethods: ['easypaisa', 'jazzcash', 'bank_transfer'],
    },
  },
  US: {
    code: 'US',
    name: 'United States',
    currencyCode: REGIONS.US.currency,
    defaultLocale: REGIONS.US.defaultLocale,
    locales: ['en'],
    active: false,
    config: {
      eligibility: { species: US_SPECIES_ELIGIBILITY, defaults: CONSERVATIVE_DEFAULT },
      compliance: {
        subdivisions: [],
        exoticRequiresApproval: true,
        kycRequiredForPayments: true,
      },
      paymentMethods: ['stripe'],
    },
  },
};

/** Returns the canonical seeded definition for a region. */
export function getRegionDefinition(code: RegionCode): RegionDefinition {
  return REGION_DEFINITIONS[code];
}

/** Returns the canonical seeded `config` payload for a region. */
export function getRegionConfig(code: RegionCode): RegionConfig {
  return REGION_DEFINITIONS[code].config;
}

/**
 * Resolves the breeding-eligibility rule for a species in a region, falling back
 * to the region's conservative defaults when the species has no explicit entry.
 */
export function getSpeciesEligibility(code: RegionCode, species: string): SpeciesEligibility {
  const { eligibility } = REGION_DEFINITIONS[code].config;
  return eligibility.species[species] ?? eligibility.defaults;
}
