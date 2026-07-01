import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SaveListingDto {
  @ApiProperty()
  @IsUUID()
  listingId!: string;
}
