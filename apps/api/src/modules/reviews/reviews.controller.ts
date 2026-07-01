import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit review after eligible completed request' })
  async create(
    @Body()
    dto: {
      requestId: string;
      subjectUserId: string;
      subjectAnimalId?: string;
      rating: number;
      title?: string;
      body?: string;
    },
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.reviews.create(dto, req.user!);
  }

  @Patch(':id')
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: { rating?: number; title?: string; body?: string },
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.reviews.update(id, dto, req.user!);
  }

  @Get()
  @ApiOperation({ summary: 'List published reviews' })
  async list(
    @Query('subjectUserId') subjectUserId: string | undefined,
    @Query('subjectAnimalId') subjectAnimalId: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.reviews.listPublic({ subjectUserId, subjectAnimalId, cursor, limit });
  }
}
