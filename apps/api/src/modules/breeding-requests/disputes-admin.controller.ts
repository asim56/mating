import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import type { AuthenticatedUser } from '../../common';
import { DisputeAdminService } from './dispute-admin.service';
import type { AssignDisputeDto, ResolveDisputeDto } from './dto/dispute-admin.dto';

@ApiTags('admin')
@Controller('admin/disputes')
@Roles('super_admin', 'support_agent')
@ApiBearerAuth()
export class DisputesAdminController {
  constructor(private readonly disputes: DisputeAdminService) {}

  @Get()
  @ApiOperation({ summary: 'List disputes for support queue' })
  async list(
    @Query('status') status: string | undefined,
    @Query('assignedTo') assignedTo: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.disputes.list({ status, assignedTo, cursor, limit });
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: { user?: AuthenticatedUser }) {
    return this.disputes.getById(id, req.user!);
  }

  @Post(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignDisputeDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.disputes.assign(id, req.user!, dto);
  }

  @Post(':id/investigate')
  async investigate(@Param('id') id: string, @Req() req: { user?: AuthenticatedUser }) {
    return this.disputes.investigate(id, req.user!);
  }

  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.disputes.resolve(id, req.user!, dto);
  }
}
