import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Admin patch for a breed. All fields optional; only provided fields change.
 * Species and region are part of the breed's identity and are not patchable here.
 */
export class UpdateBreedDto {
  @ApiPropertyOptional({
    example: 'Sahiwal',
    description: 'Breed name (unique per species/region)',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'Heat-tolerant dairy breed from the Punjab region.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Whether the breed is selectable' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
