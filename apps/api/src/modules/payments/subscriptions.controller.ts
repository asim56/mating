import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

import type { PaymentProviderCode } from '@mating/shared';

import type { AuthenticatedUser } from '../../common';
import { SubscriptionsService } from './subscriptions.service';

class CreateSubscriptionDto {
  @IsUUID()
  planId!: string;

  @IsEnum(['bank_transfer', 'easypaisa', 'jazzcash', 'stripe'])
  provider!: PaymentProviderCode;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

@ApiTags('payments')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active subscription plans for region' })
  async list(@Query('regionCode') regionCode: string | undefined) {
    return { data: await this.subscriptions.listPlans(regionCode) };
  }
}

@ApiTags('payments')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a plan' })
  async create(
    @Body() dto: CreateSubscriptionDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.subscriptions.create(dto, request.user!);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user subscription' })
  async me(@Req() request: { user?: AuthenticatedUser }) {
    const subscription = await this.subscriptions.getMine(request.user!);
    return { subscription };
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription at period end' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.subscriptions.cancelAtPeriodEnd(id, request.user!);
  }
}
