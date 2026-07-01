import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import type { RegionConfig } from '@mating/shared';

/**
 * Admin patch for a region. All fields optional; only provided fields change.
 * `config` is merged shallowly over the existing configuration. `code` and
 * `currencyCode` are immutable and intentionally not patchable here.
 */
export class UpdateRegionDto {
  @ApiPropertyOptional({ example: 'Pakistan', description: 'Human-readable region name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({ example: 'en', description: 'Default locale for the region' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  defaultLocale?: string;

  @ApiPropertyOptional({ type: [String], example: ['en', 'ur'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  locales?: string[];

  @ApiPropertyOptional({ description: 'Whether the region is active/launched' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Eligibility + compliance + payment config (merged over existing)',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  config?: Partial<RegionConfig>;
}
