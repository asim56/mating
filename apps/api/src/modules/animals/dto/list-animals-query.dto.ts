import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import type { AnimalBreedingStatus } from '@mating/shared';

const STATUSES: AnimalBreedingStatus[] = ['draft', 'publish_ready', 'listed', 'not_listed'];

export class ListAnimalsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsIn(STATUSES)
  status?: AnimalBreedingStatus;
}
