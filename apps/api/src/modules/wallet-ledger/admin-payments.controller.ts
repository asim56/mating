import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { Roles } from '../../common';
import { ReconcilePaymentDto, RefundPaymentDto } from '../payments/dto/payment.dto';
import { AdminPaymentsService } from './admin-payments.service';

@ApiTags('admin')
@Controller('admin/payments')
@Roles('super_admin')
@ApiBearerAuth()
export class AdminPaymentsController {
  constructor(private readonly admin: AdminPaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'List payment intents for reconciliation' })
  async list(
    @Query('status') status: string | undefined,
    @Query('provider') provider: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.admin.listPayments({ status, provider, cursor, limit });
  }

  @Post(':id/reconcile')
  @ApiOperation({ summary: 'Confirm bank-transfer payment' })
  async reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReconcilePaymentDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const intent = await this.admin.reconcile(id, request.user!, dto);
    return { id: intent.id, status: intent.status };
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Issue refund with reason code' })
  async refund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RefundPaymentDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const intent = await this.admin.refund(id, request.user!, dto);
    return { id: intent.id, status: intent.status };
  }
}

@ApiTags('admin')
@Controller('admin/payouts')
@Roles('super_admin')
@ApiBearerAuth()
export class AdminPayoutsController {
  constructor(private readonly admin: AdminPaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Admin list payouts' })
  async list(
    @Query('status') status: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
  ) {
    return this.admin.listPayoutsAdmin({ status, cursor, limit });
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve and release payout' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { notes?: string },
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const payout = await this.admin.approvePayout(id, request.user!, body.notes);
    return { id: payout.id, status: payout.status };
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject pending payout' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const payout = await this.admin.rejectPayout(id, request.user!, body.reason);
    return { id: payout!.id, status: payout!.status };
  }
}
