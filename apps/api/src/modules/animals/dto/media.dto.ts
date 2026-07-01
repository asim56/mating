import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class MediaUploadUrlDto {
  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  contentType!: string;

  @ApiProperty({ enum: ['image', 'document'] })
  @IsIn(['image', 'document'])
  mediaType!: 'image' | 'document';

  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  filename!: string;
}

export class MediaUploadUrlResponseDto {
  @ApiProperty()
  url!: string;

  @ApiProperty()
  path!: string;

  @ApiProperty()
  expiresAt!: string;
}

export class MediaItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['image', 'document'] })
  mediaType!: 'image' | 'document';

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty({ required: false })
  readUrl?: string;
}
