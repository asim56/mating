import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { decodeCursor } from '../../common';
import type { LedgerEntry, Payout, PayoutAccount } from './entities/ledger.entity';

export const LEDGER_REPOSITORY = 'LEDGER_REPOSITORY';

@Injectable()
export class InMemoryLedgerRepository {
  private readonly entries = new Map<string, LedgerEntry>();
  private readonly payoutAccounts = new Map<string, PayoutAccount>();
  private readonly payouts = new Map<string, Payout>();
  private readonly payoutIdempotency = new Map<string, string>();

  async insertEntries(rows: Omit<LedgerEntry, 'id' | 'createdAt'>[]): Promise<LedgerEntry[]> {
    const created: LedgerEntry[] = [];
    for (const row of rows) {
      const entry: LedgerEntry = {
        ...row,
        id: randomUUID(),
        createdAt: new Date().toISOString(),
      };
      this.entries.set(entry.id, entry);
      created.push(entry);
    }
    return created;
  }

  async listEntriesForAccount(
    accountId: string,
    filter: { entryType?: string; cursor?: string; limit: number },
  ): Promise<LedgerEntry[]> {
    let rows = [...this.entries.values()].filter((e) => e.accountId === accountId);
    if (filter.entryType) rows = rows.filter((e) => e.entryType === filter.entryType);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async sumBalanceForPayee(payeeId: string, currencyCode: string): Promise<number> {
    let balance = 0;
    for (const entry of this.entries.values()) {
      if (entry.accountType !== 'payee_balance' || entry.accountId !== payeeId) continue;
      if (entry.currencyCode !== currencyCode) continue;
      balance += entry.direction === 'credit' ? entry.amount : -entry.amount;
    }
    return balance;
  }

  async sumPendingPayouts(payeeId: string, currencyCode: string): Promise<number> {
    let pending = 0;
    for (const payout of this.payouts.values()) {
      if (payout.payeeId !== payeeId || payout.currencyCode !== currencyCode) continue;
      if (payout.status === 'pending' || payout.status === 'approved') {
        pending += payout.amount;
      }
    }
    return pending;
  }

  async createPayoutAccount(
    input: Omit<PayoutAccount, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<PayoutAccount> {
    const now = new Date().toISOString();
    const account: PayoutAccount = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.payoutAccounts.set(account.id, account);
    return account;
  }

  async listPayoutAccounts(ownerId: string): Promise<PayoutAccount[]> {
    return [...this.payoutAccounts.values()].filter((a) => a.ownerId === ownerId);
  }

  async findPayoutAccountById(id: string): Promise<PayoutAccount | null> {
    return this.payoutAccounts.get(id) ?? null;
  }

  async createPayout(input: Omit<Payout, 'id' | 'createdAt' | 'updatedAt'>): Promise<Payout> {
    const key = `${input.provider}:${input.idempotencyKey}`;
    const existingId = this.payoutIdempotency.get(key);
    if (existingId) return this.payouts.get(existingId)!;

    const now = new Date().toISOString();
    const payout: Payout = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.payouts.set(payout.id, payout);
    this.payoutIdempotency.set(key, payout.id);
    return payout;
  }

  async findPayoutById(id: string): Promise<Payout | null> {
    return this.payouts.get(id) ?? null;
  }

  async updatePayout(id: string, patch: Partial<Payout>): Promise<Payout | null> {
    const existing = this.payouts.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.payouts.set(id, updated);
    return updated;
  }

  async listPayoutsForPayee(
    payeeId: string,
    filter: { status?: string; cursor?: string; limit: number },
  ): Promise<Payout[]> {
    let rows = [...this.payouts.values()].filter((p) => p.payeeId === payeeId);
    if (filter.status) rows = rows.filter((p) => p.status === filter.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async listPayoutsAdmin(filter: {
    status?: string;
    cursor?: string;
    limit: number;
  }): Promise<Payout[]> {
    let rows = [...this.payouts.values()];
    if (filter.status) rows = rows.filter((p) => p.status === filter.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  getAllEntries(): LedgerEntry[] {
    return [...this.entries.values()];
  }
}
