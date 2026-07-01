import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import type { AuthenticatedUser } from '../../common';
import { DashboardsService } from './services/dashboards.service';

@ApiTags('admin')
@Controller('admin/dashboards')
@Roles('super_admin')
@ApiBearerAuth()
export class DashboardsController {
  constructor(private readonly dashboards: DashboardsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Business operations dashboard summary' })
  async summary(
    @Req() req: { user?: AuthenticatedUser },
    @Query('regionCode') regionCode: string | undefined,
    @Query('period') period: string | undefined,
  ) {
    return this.dashboards.summary(req.user!, { regionCode, period });
  }
}
