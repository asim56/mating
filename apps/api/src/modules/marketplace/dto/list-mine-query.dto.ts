import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import type { ListingStatus } from '@mating/shared';

const STATUSES: ListingStatus[] = [
  'draft',
  'pending_review',
  'active',
  'paused',
  'expired',
  'rejected',
  'suspended',
];

export class ListMineQueryDto {
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
  status?: ListingStatus;
}
