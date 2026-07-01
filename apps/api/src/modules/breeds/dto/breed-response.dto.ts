import { ApiProperty } from '@nestjs/swagger';

import { SPECIES } from '@mating/shared';

/** Public-safe breed view (reference data). */
export class BreedPublicDto {
  @ApiProperty({ type: String, format: 'uuid' })
  id!: string;

  @ApiProperty({ type: String, example: 'PK' })
  regionCode!: string;

  @ApiProperty({ enum: SPECIES, example: 'cattle' })
  species!: string;

  @ApiProperty({ type: String, example: 'Sahiwal' })
  name!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Heat-tolerant dairy breed.' })
  description!: string | null;
}

/** Full admin breed view including the active flag. */
export class BreedDto extends BreedPublicDto {
  @ApiProperty({ type: Boolean, example: true })
  active!: boolean;
}
