import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../../common';
import type { AuthenticatedUser } from '../../common';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationDecisionService } from './verification-decision.service';
import { VerificationDetailService } from './verification-detail.service';
import type {
  VerificationDecisionNotesDto,
  VerificationRejectDto,
} from './dto/verification-decision.dto';

@ApiTags('admin')
@Controller('admin/verifications')
@ApiBearerAuth()
export class AdminVerificationsController {
  constructor(
    private readonly verifications: VerificationQueueService,
    private readonly decisions: VerificationDecisionService,
    private readonly detail: VerificationDetailService,
  ) {}

  @Get()
  @Roles('super_admin', 'support_agent', 'veterinarian', 'inspector')
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

  @Get(':id')
  @Roles('super_admin', 'support_agent', 'veterinarian', 'inspector')
  @ApiOperation({ summary: 'Verification request detail with evidence' })
  async getById(@Param('id') id: string, @Req() req: { user?: AuthenticatedUser }) {
    return this.detail.getById(id, req.user!);
  }

  @Post(':id/approve')
  @Roles('super_admin', 'veterinarian', 'inspector')
  @ApiOperation({ summary: 'Approve verification dimension' })
  async approve(
    @Param('id') id: string,
    @Body() dto: VerificationDecisionNotesDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.decisions.approve(id, req.user!, dto.notes);
  }

  @Post(':id/reject')
  @Roles('super_admin', 'veterinarian', 'inspector')
  @ApiOperation({ summary: 'Reject verification dimension' })
  async reject(
    @Param('id') id: string,
    @Body() dto: VerificationRejectDto,
    @Req() req: { user?: AuthenticatedUser },
  ) {
    return this.decisions.reject(id, req.user!, dto.notes);
  }
}
