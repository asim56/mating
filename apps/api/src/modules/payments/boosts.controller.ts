import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req, forwardRef } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import type { PaymentProviderCode } from '@mating/shared';

import type { AuthenticatedUser } from '../../common';
import { ApiError, ERROR_CODES, buildPage, clampLimit } from '../../common';
import { HttpStatus } from '@nestjs/common';
import {
  MARKETPLACE_REPOSITORY,
  type InMemoryMarketplaceRepository,
} from '../marketplace/marketplace.repository';
import { Inject } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PAYMENTS_REPOSITORY, InMemoryPaymentsRepository } from './payments.repository';
import { BOOST_PURCHASED, type PaymentAuditEvent } from './events/payment.events';
import { AUDIT_EMITTER } from '../audit/audit.service';

class PurchaseBoostDto {
  @IsString()
  @MinLength(1)
  boostType!: string;

  @IsEnum(['bank_transfer', 'easypaisa', 'jazzcash', 'stripe'])
  provider!: PaymentProviderCode;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

@ApiTags('payments')
@Controller('listings')
export class BoostsController {
  constructor(
    @Inject(forwardRef(() => PaymentsService)) private readonly payments: PaymentsService,
    @Inject(PAYMENTS_REPOSITORY) private readonly repo: InMemoryPaymentsRepository,
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: PaymentAuditEvent): Promise<void> },
  ) {}

  @Post(':id/boost')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Purchase listing boost' })
  async purchaseBoost(
    @Param('id', ParseUUIDPipe) listingId: string,
    @Body() dto: PurchaseBoostDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const user = request.user!;
    const listing = await this.listings.findById(listingId);
    if (!listing || listing.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    if (listing.ownerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not listing owner.', HttpStatus.FORBIDDEN);
    }
    if (listing.status !== 'active') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Listing not active.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.repo.findBoostOrderByIdempotency(dto.idempotencyKey);
    if (existing) {
      const intent = existing.paymentIntentId
        ? await this.repo.findIntentById(existing.paymentIntentId)
        : null;
      return {
        boostOrder: existing,
        paymentIntent: intent,
      };
    }

    const amount = listing.priceAmount ?? 1500;
    const order = await this.repo.createBoostOrder({
      listingId,
      buyerId: user.id,
      paymentIntentId: null,
      boostType: dto.boostType,
      status: 'pending',
      startsAt: null,
      endsAt: null,
      amount,
      currencyCode: listing.currencyCode,
      idempotencyKey: dto.idempotencyKey,
    });

    const intent = await this.payments.createIntent(
      {
        purpose: 'boost',
        amount,
        currencyCode: listing.currencyCode,
        provider: dto.provider,
        boostOrderId: order.id,
        idempotencyKey: `${dto.idempotencyKey}-intent`,
      },
      user,
    );

    await this.repo.updateBoostOrder(order.id, { paymentIntentId: intent.id });
    await this.audit.emit({
      action: BOOST_PURCHASED,
      actorId: user.id,
      subjectType: 'boost_order',
      subjectId: order.id,
    });

    return { boostOrder: { ...order, paymentIntentId: intent.id }, paymentIntent: intent };
  }
}

@ApiTags('payments')
@Controller('boost-orders')
export class BoostOrdersController {
  constructor(@Inject(PAYMENTS_REPOSITORY) private readonly repo: InMemoryPaymentsRepository) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own boost orders' })
  async list(
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
    @Query('status') status: string | undefined,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const pageLimit = clampLimit(limit);
    const rows = await this.repo.listBoostOrdersForBuyer(request.user!.id, {
      cursor,
      limit: pageLimit,
      status,
    });
    return buildPage(rows, pageLimit, (row) => row.createdAt);
  }
}
