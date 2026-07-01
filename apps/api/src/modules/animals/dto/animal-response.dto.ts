import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type {
  AnimalBreedingStatus,
  AnimalHealthStatus,
  AnimalSex,
  RegionCode,
  Species,
  VerificationDimensionMap,
} from '@mating/shared';

export class AnimalResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  ownerId!: string;

  @ApiProperty()
  regionCode!: RegionCode;

  @ApiProperty({ enum: ['cattle', 'buffalo', 'goat', 'sheep', 'dog'] })
  species!: Species;

  @ApiPropertyOptional()
  breedId?: string | null;

  @ApiPropertyOptional()
  name?: string | null;

  @ApiProperty({ enum: ['male', 'female', 'unknown'] })
  sex!: AnimalSex;

  @ApiPropertyOptional()
  dateOfBirth?: string | null;

  @ApiPropertyOptional()
  approximateAgeMonths?: number | null;

  @ApiPropertyOptional()
  countryCode?: string | null;

  @ApiProperty({ enum: ['draft', 'publish_ready', 'listed', 'not_listed'] })
  breedingStatus!: AnimalBreedingStatus;

  @ApiProperty({ enum: ['unknown', 'healthy', 'attention', 'blocked'] })
  healthStatus!: AnimalHealthStatus;

  @ApiProperty()
  ownerDeclaration!: boolean;

  @ApiProperty()
  verificationDimensions!: VerificationDimensionMap;

  @ApiPropertyOptional()
  mediaCount?: number;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}

export function toAnimalResponse(
  animal: import('../entities/animal.entity').Animal,
  mediaCount?: number,
): AnimalResponseDto {
  return {
    id: animal.id,
    ownerId: animal.ownerId,
    regionCode: animal.regionCode,
    species: animal.species,
    breedId: animal.breedId,
    name: animal.name,
    sex: animal.sex,
    dateOfBirth: animal.dateOfBirth,
    approximateAgeMonths: animal.approximateAgeMonths,
    countryCode: animal.countryCode,
    breedingStatus: animal.breedingStatus,
    healthStatus: animal.healthStatus,
    ownerDeclaration: animal.ownerDeclaration,
    verificationDimensions: animal.verificationDimensions,
    ...(mediaCount !== undefined ? { mediaCount } : {}),
    createdAt: animal.createdAt,
    updatedAt: animal.updatedAt,
  };
}
