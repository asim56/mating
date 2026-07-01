import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { ListingType, VerificationDimensionMap } from '@mating/shared';

/** Public-safe listing detail — explicit allowlist; no phone fields. */
export class PublicListingDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string | null;

  @ApiProperty()
  listingType!: ListingType;

  @ApiProperty()
  species!: string;

  @ApiPropertyOptional()
  breedName?: string | null;

  @ApiProperty()
  sex!: string;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiProperty()
  breedingMethod!: string;

  @ApiPropertyOptional()
  fee?: { amount: string; currencyCode: string } | null;

  @ApiProperty()
  ownerDisplayName!: string | null;

  @ApiProperty()
  verificationDimensions!: VerificationDimensionMap;

  @ApiProperty()
  publishedAt!: string | null;
}
