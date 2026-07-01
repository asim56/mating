import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { BREEDING_METHODS, LISTING_TYPES, type BreedingMethod, type ListingType } from '@mating/shared';

export class CreateListingDto {
  @ApiProperty()
  @IsUUID()
  animalId!: string;

  @ApiProperty({ enum: LISTING_TYPES })
  @IsIn([...LISTING_TYPES])
  listingType!: ListingType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: BREEDING_METHODS })
  @IsIn([...BREEDING_METHODS])
  breedingMethod!: BreedingMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  locationRadiusKm?: number;
}

export class UpdateListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: BREEDING_METHODS })
  @IsOptional()
  @IsIn([...BREEDING_METHODS])
  breedingMethod?: BreedingMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  locationRadiusKm?: number;
}
