import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { BREEDING_METHODS, LOCATION_TYPES, type BreedingMethod } from '@mating/shared';

export class CreateBreedingRequestDto {
  @ApiProperty()
  @IsUUID()
  listingId!: string;

  @ApiProperty()
  @IsUUID()
  requesterAnimalId!: string;

  @ApiProperty()
  @IsUUID()
  recipientAnimalId!: string;

  @ApiProperty({ enum: BREEDING_METHODS })
  @IsIn([...BREEDING_METHODS])
  breedingMethod!: BreedingMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  proposedAt?: string;

  @ApiPropertyOptional({ enum: LOCATION_TYPES })
  @IsOptional()
  @IsIn([...LOCATION_TYPES])
  locationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  locationDetails?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class RejectBreedingRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ScheduleBreedingRequestDto {
  @ApiProperty()
  @IsISO8601()
  scheduledAt!: string;

  @ApiPropertyOptional({ enum: LOCATION_TYPES })
  @IsOptional()
  @IsIn([...LOCATION_TYPES])
  locationType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  locationDetails?: Record<string, unknown>;
}

export class OpenDisputeDto {
  @ApiProperty()
  @IsString()
  reasonCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class ListBreedingRequestsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['requester', 'recipient', 'all'] })
  @IsOptional()
  @IsIn(['requester', 'recipient', 'all'])
  role?: 'requester' | 'recipient' | 'all';
}
