import type {
  LedgerAccountType,
  LedgerEntryType,
  PayoutStatus,
  RefundReasonCode,
} from '@mating/shared';

export type LedgerEntry = {
  id: string;
  paymentIntentId: string | null;
  payoutId: string | null;
  accountType: LedgerAccountType;
  accountId: string | null;
  entryType: LedgerEntryType;
  transactionId: string;
  amount: number;
  currencyCode: string;
  direction: 'debit' | 'credit';
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PayoutAccount = {
  id: string;
  ownerId: string;
  provider: string;
  accountType: string;
  accountReference: string;
  status: 'unverified' | 'verified' | 'disabled';
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Payout = {
  id: string;
  payeeId: string;
  payoutAccountId: string;
  amount: number;
  currencyCode: string;
  status: PayoutStatus;
  provider: string;
  providerReference: string | null;
  idempotencyKey: string;
  approvedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type LedgerWriteInput = {
  paymentIntentId?: string;
  payoutId?: string;
  entryType: LedgerEntryType;
  amount: number;
  currencyCode: string;
  payerId: string;
  payeeId: string;
  metadata?: Record<string, unknown>;
};

export type RefundWriteInput = {
  paymentIntentId: string;
  amount: number;
  currencyCode: string;
  payerId: string;
  payeeId: string;
  reasonCode: RefundReasonCode;
  adminId: string;
  metadata?: Record<string, unknown>;
};

export type PayoutReleaseInput = {
  payoutId: string;
  payeeId: string;
  amount: number;
  currencyCode: string;
  adminId: string;
  metadata?: Record<string, unknown>;
};
