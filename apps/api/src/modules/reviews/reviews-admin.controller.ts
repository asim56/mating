import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import type { AuthenticatedUser } from '../../common';
import type { ReviewStatus } from '@mating/shared';
import { ReviewsService } from './reviews.service';
import { ReputationService } from './reputation.service';

@ApiTags('admin')
@Controller()
export class ReviewsAdminController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly reputation: ReputationService,
  ) {}

  @Post('admin/reviews/:id/moderate')
  @Roles('super_admin', 'support_agent')
  @ApiBearerAuth()
  async moderate(
    @Param('id') id: string,
    @Body() dto: { action: 'approve' | 'hide'; notes?: string },
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.reviews.moderate(id, req.user!, dto.action, dto.notes);
  }

  @Get('admin/reviews')
  @Roles('super_admin', 'support_agent')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review moderation queue' })
  async listAdmin(
    @Query('status') status: ReviewStatus | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.reviews.listAdmin({ status, cursor, limit });
  }

  @Get('users/:id/reputation')
  @ApiOperation({ summary: 'Reputation summary for profile surfaces' })
  async getReputation(@Param('id') id: string) {
    return this.reputation.getForUser(id);
  }
}
