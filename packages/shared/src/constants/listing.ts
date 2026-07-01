import type { ListingStatus, ListingType } from '../types/listing';

export const LISTING_STATUS = [
  'draft',
  'pending_review',
  'active',
  'paused',
  'expired',
  'rejected',
  'suspended',
] as const satisfies readonly ListingStatus[];

export const LISTING_TYPES = [
  'animal',
  'stud_service',
  'breeder_profile',
  'semen_provider',
  'expected_offspring',
] as const satisfies readonly ListingType[];

/** Documented compatibility scoring weights (must sum to 100). */
export const COMPATIBILITY_WEIGHTS = {
  breedCompatibility: 25,
  healthReadiness: 20,
  pedigreeCompleteness: 15,
  distance: 15,
  verificationLevel: 10,
  priorOutcomes: 10,
  lowDisputeRisk: 5,
} as const;

export const COMPATIBILITY_WEIGHT_TOTAL = Object.values(COMPATIBILITY_WEIGHTS).reduce(
  (sum, w) => sum + w,
  0,
);

export const LISTING_PUBLISH_REQUIREMENTS = [
  'animal_publish_ready',
  'title',
  'breeding_method',
  'listing_type_fields',
  'region_eligibility',
] as const;

export type ListingPublishRequirement = (typeof LISTING_PUBLISH_REQUIREMENTS)[number];
