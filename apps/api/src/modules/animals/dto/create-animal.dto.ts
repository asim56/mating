import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import { REGIONS, SPECIES, type RegionCode, type Species } from '@mating/shared';

const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

export class CreateAnimalDto {
  @ApiProperty({ enum: SPECIES })
  @IsIn(SPECIES)
  species!: Species;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  breedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiProperty({ enum: ['male', 'female', 'unknown'] })
  @IsIn(['male', 'female', 'unknown'])
  sex!: 'male' | 'female' | 'unknown';

  @ApiPropertyOptional({ enum: REGION_CODES })
  @IsOptional()
  @IsIn(REGION_CODES)
  regionCode?: RegionCode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  approximateAgeMonths?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceOrState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryCode?: string;
}
