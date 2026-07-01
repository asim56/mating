import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

import type { AnimalHealthStatus } from '@mating/shared';

const HEALTH_STATUSES: AnimalHealthStatus[] = ['unknown', 'healthy', 'attention', 'blocked'];

export class UpdateAnimalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  breedId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'unknown'] })
  @IsOptional()
  @IsIn(['male', 'female', 'unknown'])
  sex?: 'male' | 'female' | 'unknown';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  ownerDeclaration?: boolean;

  @ApiPropertyOptional({ enum: HEALTH_STATUSES })
  @IsOptional()
  @IsIn(HEALTH_STATUSES)
  healthStatus?: AnimalHealthStatus;
}
