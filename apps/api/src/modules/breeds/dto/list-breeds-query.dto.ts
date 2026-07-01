import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

import { REGIONS, SPECIES, type RegionCode, type Species } from '@mating/shared';

const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

/** Optional filters for the public breed listing. */
export class ListBreedsQueryDto {
  @ApiPropertyOptional({ enum: REGION_CODES, example: 'PK' })
  @IsOptional()
  @IsIn(REGION_CODES)
  regionCode?: RegionCode;

  @ApiPropertyOptional({ enum: SPECIES, example: 'cattle' })
  @IsOptional()
  @IsIn(SPECIES)
  species?: Species;
}
