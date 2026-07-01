import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import { VerificationQueueService } from './verification-queue.service';

@ApiTags('admin')
@Controller('admin/verifications')
@Roles('super_admin', 'support_agent')
@ApiBearerAuth()
export class AdminVerificationsController {
  constructor(private readonly verifications: VerificationQueueService) {}

  @Get()
  @ApiOperation({ summary: 'Admin pending verification queue' })
  async list(
    @Query('status') status: string | undefined,
    @Query('dimension') dimension: string | undefined,
    @Query('subjectType') subjectType: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.verifications.listAdmin({ status, dimension, subjectType, cursor, limit });
  }
}
