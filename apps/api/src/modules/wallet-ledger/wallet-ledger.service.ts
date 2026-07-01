import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

import {
  ApiError,
  ERROR_CODES,
  buildPage,
  clampLimit,
  type AuthenticatedUser,
} from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import { LedgerWriterService } from './ledger-writer.service';
import {
  LEDGER_REPOSITORY,
  InMemoryLedgerRepository,
} from './ledger.repository';
import type { LedgerAuditEvent } from './events/ledger.events';

export class CreatePayoutAccountDto {
  @IsString()
  provider!: string;

  @IsEnum(['bank_account', 'mobile_wallet'])
  accountType!: 'bank_account' | 'mobile_wallet';

  @IsString()
  @MinLength(4)
  accountReference!: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreatePayoutDto {
  @IsUUID()
  payoutAccountId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  currencyCode!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

@Injectable()
export class WalletLedgerService {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly repo: InMemoryLedgerRepository,
    @Inject(forwardRef(() => LedgerWriterService)) private readonly ledgerWriter: LedgerWriterService,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: LedgerAuditEvent): Promise<void> },
  ) {}

  async getBalance(user: AuthenticatedUser, currencyCode = 'PKR') {
    const available = await this.repo.sumBalanceForPayee(user.id, currencyCode);
    const pending = await this.repo.sumPendingPayouts(user.id, currencyCode);
    const entries = await this.repo.listEntriesForAccount(user.id, { limit: 1 });
    return {
      availableBalance: Math.max(0, available - pending),
      pendingBalance: pending,
      currencyCode,
      lastUpdatedAt: entries[0]?.createdAt ?? new Date().toISOString(),
    };
  }

  async listEntries(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; entryType?: string },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listEntriesForAccount(user.id, { ...query, limit });
    const page = buildPage(rows, limit, (row) => row.createdAt);
    return {
      data: page.data.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        direction: e.direction,
        amount: e.amount,
        currencyCode: e.currencyCode,
        createdAt: e.createdAt,
      })),
      meta: page.meta,
    };
  }

  async createPayoutAccount(dto: CreatePayoutAccountDto, user: AuthenticatedUser) {
    return this.repo.createPayoutAccount({
      ownerId: user.id,
      provider: dto.provider,
      accountType: dto.accountType,
      accountReference: maskReference(dto.accountReference),
      status: 'unverified',
      metadata: dto.metadata ?? {},
    });
  }

  async listPayoutAccounts(user: AuthenticatedUser) {
    const data = await this.repo.listPayoutAccounts(user.id);
    return { data };
  }

  async requestPayout(dto: CreatePayoutDto, user: AuthenticatedUser) {
    const account = await this.repo.findPayoutAccountById(dto.payoutAccountId);
    if (!account || account.ownerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Invalid payout account.', HttpStatus.FORBIDDEN);
    }

    const balance = await this.getBalance(user, dto.currencyCode);
    if (dto.amount > balance.availableBalance) {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Insufficient balance.', HttpStatus.BAD_REQUEST);
    }

    const payout = await this.repo.createPayout({
      payeeId: user.id,
      payoutAccountId: dto.payoutAccountId,
      amount: dto.amount,
      currencyCode: dto.currencyCode,
      status: 'pending',
      provider: account.provider,
      providerReference: null,
      idempotencyKey: dto.idempotencyKey,
      approvedBy: null,
      metadata: {},
    });

    await this.audit.emit({
      action: 'payout.requested',
      actorId: user.id,
      subjectType: 'payout',
      subjectId: payout.id,
    });

    return payout;
  }

  async listPayouts(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: string },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.repo.listPayoutsForPayee(user.id, { ...query, limit });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async getPayout(id: string, user: AuthenticatedUser) {
    const payout = await this.repo.findPayoutById(id);
    if (!payout || payout.payeeId !== user.id) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Payout not found.', HttpStatus.NOT_FOUND);
    }
    return payout;
  }
}

function maskReference(ref: string): string {
  if (ref.length <= 4) return '****';
  return `${'*'.repeat(ref.length - 4)}${ref.slice(-4)}`;
}
