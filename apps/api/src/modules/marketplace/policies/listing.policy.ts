import { HttpStatus } from '@nestjs/common';

import {
  LISTING_PUBLISH_REQUIREMENTS,
  evaluatePublishReadyEligibility,
  getRegionConfig,
  type ListingPublishRequirement,
  type ListingType,
} from '@mating/shared';

import { ApiError, ERROR_CODES } from '../../../common';
import type { Animal } from '../../animals/entities/animal.entity';
import type { Listing } from '../entities/listing.entity';

export type PublishValidationResult =
  | { valid: true }
  | { valid: false; missing: ListingPublishRequirement[]; messages: string[] };

export function validateListingPublish(
  listing: Listing,
  animal: Animal,
  imageCount: number,
): PublishValidationResult {
  const missing: ListingPublishRequirement[] = [];
  const messages: string[] = [];

  if (animal.breedingStatus !== 'publish_ready') {
    missing.push('animal_publish_ready');
    messages.push('Animal must be publish-ready before listing publish.');
  }
  if (animal.deletedAt) {
    missing.push('animal_publish_ready');
    messages.push('Animal is deleted.');
  }
  if (animal.healthStatus === 'blocked') {
    missing.push('region_eligibility');
    messages.push('Animal health status is blocked.');
  }
  if (!listing.title?.trim()) {
    missing.push('title');
    messages.push('Title is required.');
  }
  if (!listing.breedingMethod) {
    missing.push('breeding_method');
    messages.push('Breeding method is required.');
  }

  const typeMissing = validateListingTypeFields(listing);
  if (typeMissing.length > 0) {
    missing.push('listing_type_fields');
    messages.push(...typeMissing);
  }

  const eligibility = evaluatePublishReadyEligibility({
    regionCode: animal.regionCode,
    species: animal.species,
    dateOfBirth: animal.dateOfBirth,
    approximateAgeMonths: animal.approximateAgeMonths,
    ownerDeclaration: animal.ownerDeclaration,
    imageCount,
    healthStatus: animal.healthStatus,
    sex: animal.sex,
    countryCode: animal.countryCode,
  });
  if (!eligibility.eligible) {
    missing.push('region_eligibility');
    messages.push(...eligibility.messages);
  }

  getRegionConfig(animal.regionCode);

  if (missing.length > 0) {
    return { valid: false, missing: [...new Set(missing)], messages };
  }
  return { valid: true };
}

function validateListingTypeFields(listing: Listing): string[] {
  const errors: string[] = [];
  const feeTypes: ListingType[] = ['animal', 'stud_service', 'semen_provider'];
  if (feeTypes.includes(listing.listingType) && listing.priceAmount == null) {
    errors.push('Price is required for this listing type.');
  }
  if (listing.locationRadiusKm == null) {
    errors.push('Location radius is required.');
  }
  return errors;
}

export function assertCanPublish(
  listing: Listing,
  animal: Animal,
  imageCount: number,
): void {
  const result = validateListingPublish(listing, animal, imageCount);
  if (!result.valid) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      result.messages.join(' '),
      HttpStatus.BAD_REQUEST,
      { missing: result.missing },
    );
  }
}

export { LISTING_PUBLISH_REQUIREMENTS };
