import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { REGIONS, SPECIES, type RegionCode, type Species } from '@mating/shared';

const REGION_CODES = Object.keys(REGIONS) as RegionCode[];

/** Admin payload to create a breed. The (species, name, region) triple is unique. */
export class CreateBreedDto {
  @ApiProperty({ enum: REGION_CODES, example: 'PK' })
  @IsIn(REGION_CODES)
  regionCode!: RegionCode;

  @ApiProperty({ enum: SPECIES, example: 'cattle' })
  @IsIn(SPECIES)
  species!: Species;

  @ApiProperty({ example: 'Sahiwal', description: 'Breed name; unique per species and region' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Heat-tolerant dairy breed from the Punjab region.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the breed is selectable', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
