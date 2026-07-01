import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import {
  CreatePayoutAccountDto,
  CreatePayoutDto,
  WalletLedgerService,
} from './wallet-ledger.service';

@ApiTags('wallet-ledger')
@Controller('payout-accounts')
export class PayoutAccountsController {
  constructor(private readonly wallet: WalletLedgerService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register payout destination' })
  async create(
    @Body() dto: CreatePayoutAccountDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.createPayoutAccount(dto, request.user!);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own payout accounts' })
  async list(@Req() request: { user?: AuthenticatedUser }) {
    return this.wallet.listPayoutAccounts(request.user!);
  }
}

@ApiTags('wallet-ledger')
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly wallet: WalletLedgerService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request payout' })
  async create(
    @Body() dto: CreatePayoutDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.requestPayout(dto, request.user!);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own payouts' })
  async list(
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
    @Query('status') status: string | undefined,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.listPayouts(request.user!, { cursor, limit, status });
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payout' })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.getPayout(id, request.user!);
  }
}

@ApiTags('wallet-ledger')
@Controller('ledger')
export class LedgerController {
  constructor(private readonly wallet: WalletLedgerService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payee balance summary' })
  async balance(
    @Query('currencyCode') currencyCode: string | undefined,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.getBalance(request.user!, currencyCode);
  }

  @Get('me/entries')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Own ledger entries' })
  async entries(
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
    @Query('entryType') entryType: string | undefined,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.wallet.listEntries(request.user!, { cursor, limit, entryType });
  }
}
