import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ListingStatus, ListingType, PublicListingSummary } from '@mating/shared';

import type { Listing } from '../entities/listing.entity';

export class ListingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  animalId!: string;

  @ApiProperty()
  status!: ListingStatus;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  listingType!: ListingType;

  @ApiPropertyOptional()
  publishedAt?: string | null;
}

export function toListingResponse(listing: Listing): ListingResponseDto {
  return {
    id: listing.id,
    animalId: listing.animalId,
    status: listing.status,
    title: listing.title,
    listingType: listing.listingType,
    publishedAt: listing.publishedAt,
  };
}

export function toPublicSummary(
  listing: Listing,
  extras?: { compatibilityScore?: number; distanceKm?: number },
): PublicListingSummary {
  const approved = Object.values(listing.verificationDimensions).filter(
    (v) => v === 'approved',
  ).length;
  return {
    id: listing.id,
    title: listing.title,
    listingType: listing.listingType,
    species: listing.species,
    breedName: listing.breedName,
    sex: listing.sex,
    city: listing.city,
    fee:
      listing.priceAmount != null
        ? { amount: listing.priceAmount.toFixed(2), currencyCode: listing.currencyCode }
        : null,
    breedingMethod: listing.breedingMethod,
    verificationSummary: {
      approvedCount: approved,
      dimensions: listing.verificationDimensions as Record<string, string>,
    },
    publishedAt: listing.publishedAt,
    ...(extras?.compatibilityScore !== undefined
      ? { compatibilityScore: extras.compatibilityScore }
      : {}),
    ...(extras?.distanceKm !== undefined ? { distanceKm: extras.distanceKm } : {}),
  };
}
