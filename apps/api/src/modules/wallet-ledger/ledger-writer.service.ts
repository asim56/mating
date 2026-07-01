import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { Inject } from '@nestjs/common';

import type { LedgerEntry } from './entities/ledger.entity';
import type {
  LedgerWriteInput,
  PayoutReleaseInput,
  RefundWriteInput,
} from './entities/ledger.entity';
import { LEDGER_REPOSITORY, InMemoryLedgerRepository } from './ledger.repository';

@Injectable()
export class LedgerWriterService {
  constructor(
    @Inject(LEDGER_REPOSITORY) private readonly repo: InMemoryLedgerRepository,
  ) {}

  async writePaymentConfirmed(input: LedgerWriteInput): Promise<LedgerEntry[]> {
    const transactionId = randomUUID();
    const meta = input.metadata ?? {};
    const rows = [
      {
        paymentIntentId: input.paymentIntentId ?? null,
        payoutId: null,
        accountType: 'payer_external' as const,
        accountId: input.payerId,
        entryType: input.entryType,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'debit' as const,
        metadata: meta,
      },
      {
        paymentIntentId: input.paymentIntentId ?? null,
        payoutId: null,
        accountType: 'payee_balance' as const,
        accountId: input.payeeId,
        entryType: input.entryType,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'credit' as const,
        metadata: meta,
      },
    ];
    this.assertBalanced(rows);
    return this.repo.insertEntries(rows);
  }

  async writeRefund(input: RefundWriteInput): Promise<LedgerEntry[]> {
    const transactionId = randomUUID();
    const meta = { reasonCode: input.reasonCode, adminId: input.adminId, ...input.metadata };
    const rows = [
      {
        paymentIntentId: input.paymentIntentId,
        payoutId: null,
        accountType: 'payee_balance' as const,
        accountId: input.payeeId,
        entryType: 'refund' as const,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'debit' as const,
        metadata: meta,
      },
      {
        paymentIntentId: input.paymentIntentId,
        payoutId: null,
        accountType: 'payer_external' as const,
        accountId: input.payerId,
        entryType: 'refund' as const,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'credit' as const,
        metadata: meta,
      },
    ];
    this.assertBalanced(rows);
    return this.repo.insertEntries(rows);
  }

  async writePayoutRelease(input: PayoutReleaseInput): Promise<LedgerEntry[]> {
    const transactionId = randomUUID();
    const meta = { adminId: input.adminId, ...input.metadata };
    const rows = [
      {
        paymentIntentId: null,
        payoutId: input.payoutId,
        accountType: 'payee_balance' as const,
        accountId: input.payeeId,
        entryType: 'payout_release' as const,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'debit' as const,
        metadata: meta,
      },
      {
        paymentIntentId: null,
        payoutId: input.payoutId,
        accountType: 'platform_revenue' as const,
        accountId: null,
        entryType: 'payout_release' as const,
        transactionId,
        amount: input.amount,
        currencyCode: input.currencyCode,
        direction: 'credit' as const,
        metadata: meta,
      },
    ];
    this.assertBalanced(rows);
    return this.repo.insertEntries(rows);
  }

  private assertBalanced(
    rows: Array<{ amount: number; direction: 'debit' | 'credit'; currencyCode: string }>,
  ): void {
    const byCurrency = new Map<string, { debit: number; credit: number }>();
    for (const row of rows) {
      const bucket = byCurrency.get(row.currencyCode) ?? { debit: 0, credit: 0 };
      if (row.direction === 'debit') bucket.debit += row.amount;
      else bucket.credit += row.amount;
      byCurrency.set(row.currencyCode, bucket);
    }
    for (const [currency, sums] of byCurrency) {
      if (Math.abs(sums.debit - sums.credit) > 0.001) {
        throw new Error(`Unbalanced ledger transaction for ${currency}`);
      }
    }
  }
}
