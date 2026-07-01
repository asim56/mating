import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import type { AuthenticatedUser } from '../../common';
import { AuditExplorerService } from './services/audit-explorer.service';

@ApiTags('admin')
@Controller('admin/audit-logs')
@Roles('super_admin', 'support_agent')
@ApiBearerAuth()
export class AuditExplorerController {
  constructor(private readonly explorer: AuditExplorerService) {}

  @Get()
  @ApiOperation({ summary: 'Search audit logs with cursor pagination' })
  async query(
    @Req() req: { user?: AuthenticatedUser },
    @Query('actorId') actorId: string | undefined,
    @Query('subjectType') subjectType: string | undefined,
    @Query('subjectId') subjectId: string | undefined,
    @Query('action') action: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.explorer.query(req.user!, {
      actorId,
      subjectType,
      subjectId,
      action,
      from,
      to,
      cursor,
      limit,
    });
  }

  @Get(':id')
  @Roles('super_admin')
  @ApiOperation({ summary: 'Single audit log entry' })
  async getById(
    @Param('id') id: string,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.explorer.getById(req.user!, id);
  }
}
