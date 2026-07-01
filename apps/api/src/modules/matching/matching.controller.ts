import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

import { Public, RateLimit, type AuthenticatedUser } from '../../common';
import { MatchingService } from './matching.service';

class SearchListingsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  regionCode?: string;

  @IsOptional()
  @IsUUID()
  requesterAnimalId?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsIn(['relevance', 'newest', 'fee_asc', 'fee_desc'])
  sort?: 'relevance' | 'newest' | 'fee_asc' | 'fee_desc';
}

@ApiTags('matching')
@Controller('listings')
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get()
  @Public()
  @RateLimit('search')
  @ApiOperation({ summary: 'Search active listings with deterministic ranking' })
  search(
    @Query() query: SearchListingsQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.matching.search(query, request.user);
  }
}
