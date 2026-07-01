import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import type { HealthRecordType } from '@mating/shared';

const RECORD_TYPES: HealthRecordType[] = [
  'vaccination',
  'deworming',
  'disease_test',
  'fertility',
  'pregnancy',
  'certificate',
  'contraindication',
];

export class CreateHealthRecordDto {
  @ApiProperty({ enum: RECORD_TYPES })
  @IsIn(RECORD_TYPES)
  recordType!: HealthRecordType;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ example: '2025-01-15' })
  @IsString()
  recordDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storagePath?: string;
}
