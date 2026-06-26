import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@mating/shared';

/** Query params shared by every cursor-paginated list endpoint. */
export class CursorPaginationQueryDto {
  @ApiPropertyOptional({ description: 'Opaque cursor returned by a previous page' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINATION_MAX_LIMIT,
    default: PAGINATION_DEFAULT_LIMIT,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit?: number;
}

export class CursorMetaDto {
  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty()
  hasMore!: boolean;
}
