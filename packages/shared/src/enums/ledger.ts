export const LEDGER_ACCOUNT_TYPES = [
  'platform_escrow',
  'payee_balance',
  'payer_external',
  'platform_revenue',
] as const;

export type LedgerAccountType = (typeof LEDGER_ACCOUNT_TYPES)[number];

export const LEDGER_ENTRY_TYPES = [
  'payment_confirmed',
  'refund',
  'payout_release',
  'fee',
] as const;

export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];

export const REFUND_REASON_CODES = [
  'dispute_resolution',
  'cancellation',
  'admin_adjustment',
  'duplicate_charge',
  'service_not_delivered',
] as const;

export type RefundReasonCode = (typeof REFUND_REASON_CODES)[number];

export const PAYMENT_PROOF_BUCKET = 'payment-proofs' as const;

export const PAYOUT_STATUSES = ['pending', 'approved', 'released', 'rejected'] as const;

export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const BOOST_ORDER_STATUSES = ['pending', 'active', 'expired', 'cancelled'] as const;

export type BoostOrderStatus = (typeof BOOST_ORDER_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'past_due', 'cancelled'] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
