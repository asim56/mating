import { ApiProperty } from '@nestjs/swagger';

/** Public-safe region view (no eligibility/compliance config). */
export class RegionPublicDto {
  @ApiProperty({ type: String, example: 'PK' })
  code!: string;

  @ApiProperty({ type: String, example: 'Pakistan' })
  name!: string;

  @ApiProperty({ type: String, example: 'PKR' })
  currencyCode!: string;

  @ApiProperty({ type: String, example: 'en' })
  defaultLocale!: string;

  @ApiProperty({ type: [String], example: ['en', 'ur'] })
  locales!: string[];

  @ApiProperty({ type: [String], example: ['easypaisa', 'jazzcash', 'bank_transfer'] })
  paymentMethods!: string[];
}

/** Full admin region view including the eligibility + compliance config. */
export class RegionDto {
  @ApiProperty({ type: String, example: 'PK' })
  code!: string;

  @ApiProperty({ type: String, example: 'Pakistan' })
  name!: string;

  @ApiProperty({ type: String, example: 'PKR' })
  currencyCode!: string;

  @ApiProperty({ type: String, example: 'en' })
  defaultLocale!: string;

  @ApiProperty({ type: [String], example: ['en', 'ur'] })
  locales!: string[];

  @ApiProperty({ type: Boolean, example: true })
  active!: boolean;

  @ApiProperty({
    type: Object,
    description: 'Eligibility (min age/health by species) + compliance + payment methods',
  })
  config!: Record<string, unknown>;
}
