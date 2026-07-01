import { ANIMAL_PUBLISH_READY_REQUIREMENTS, type PublishReadyRequirement } from '../constants/animal';
import { getRegionConfig, getSpeciesEligibility } from '../config/eligibility';
import type { AnimalHealthStatus } from '../types/animal';
import type { RegionCode, Species } from '../types';

export type PublishReadyInput = {
  regionCode: RegionCode;
  species: Species;
  dateOfBirth?: string | null;
  approximateAgeMonths?: number | null;
  ownerDeclaration: boolean;
  imageCount: number;
  healthStatus: AnimalHealthStatus;
  sex?: string | null;
  countryCode?: string | null;
};

export type EligibilityResult =
  | { eligible: true }
  | { eligible: false; missing: PublishReadyRequirement[]; messages: string[] };

function ageInMonths(input: PublishReadyInput): number | null {
  if (input.approximateAgeMonths != null) {
    return input.approximateAgeMonths;
  }
  if (!input.dateOfBirth) {
    return null;
  }
  const dob = new Date(input.dateOfBirth);
  const now = new Date();
  const months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  return Math.max(0, months);
}

/**
 * Evaluates whether an animal meets publish-ready eligibility for its region.
 * Reads canonical min-age rules from {@link getRegionConfig}.
 */
export function evaluatePublishReadyEligibility(input: PublishReadyInput): EligibilityResult {
  const missing: PublishReadyRequirement[] = [];
  const messages: string[] = [];

  if (!input.sex || !input.countryCode) {
    missing.push('required_fields');
    messages.push('Sex and country are required.');
  }

  if (!input.ownerDeclaration) {
    missing.push('owner_declaration');
    messages.push('Owner declaration must be accepted.');
  }

  if (input.imageCount < 1) {
    missing.push('image_count');
    messages.push('At least one image is required.');
  }

  if (input.healthStatus === 'blocked') {
    missing.push('health_not_blocked');
    messages.push('Animal health status is blocked.');
  }

  const ageMonths = ageInMonths(input);
  const rules = getSpeciesEligibility(input.regionCode, input.species);
  if (ageMonths === null) {
    missing.push('min_age');
    messages.push('Date of birth or approximate age is required.');
  } else if (ageMonths < rules.minAgeMonths) {
    missing.push('min_age');
    messages.push(
      `Animal must be at least ${rules.minAgeMonths} months old for ${input.species} in ${input.regionCode}.`,
    );
  }

  if (missing.length > 0) {
    return { eligible: false, missing, messages };
  }
  return { eligible: true };
}

/** Re-export for consumers that need the requirement list. */
export { ANIMAL_PUBLISH_READY_REQUIREMENTS, getRegionConfig };
