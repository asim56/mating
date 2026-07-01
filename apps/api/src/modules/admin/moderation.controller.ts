import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import type {
  ApproveCategoryDto,
  ReportMessageDto,
  SuspendAnimalDto,
  SuspendListingDto,
  UnsuspendDto,
} from './dto/moderation.dto';
import { ModerationService } from './services/moderation.service';

@ApiTags('admin')
@Controller('admin')
@ApiBearerAuth()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('listings/:id/suspend')
  @ApiOperation({ summary: 'Suspend listing for policy violation' })
  async suspendListing(
    @Param('id') id: string,
    @Body() dto: SuspendListingDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.suspendListing(id, req.user!, dto);
  }

  @Post('listings/:id/unsuspend')
  async unsuspendListing(
    @Param('id') id: string,
    @Body() dto: UnsuspendDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.unsuspendListing(id, req.user!, dto);
  }

  @Post('listings/:id/approve-category')
  async approveCategory(
    @Param('id') id: string,
    @Body() dto: ApproveCategoryDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.approveCategory(id, req.user!, dto);
  }

  @Post('animals/:id/suspend')
  async suspendAnimal(
    @Param('id') id: string,
    @Body() dto: SuspendAnimalDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.suspendAnimal(id, req.user!, dto);
  }

  @Post('animals/:id/unsuspend')
  async unsuspendAnimal(
    @Param('id') id: string,
    @Body() dto: UnsuspendDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.unsuspendAnimal(id, req.user!, dto);
  }

  @Post('messages/:id/report')
  async reportMessage(
    @Param('id') id: string,
    @Body() dto: ReportMessageDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.reportMessage(id, req.user!, dto);
  }

  @Post('conversations/:id/freeze')
  async freezeConversation(
    @Param('id') id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.moderation.freezeConversation(id, req.user!);
  }

  @Get('moderation/queue')
  @ApiOperation({ summary: 'Unified moderation inbox' })
  async queue(
    @Query('type') type: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.moderation.moderationQueue({ type, cursor, limit });
  }
}
