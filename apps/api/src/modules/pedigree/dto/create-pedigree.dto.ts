import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePedigreeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  sireAnimalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  damAnimalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registryNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentPath?: string;
}
