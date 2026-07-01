export const PAYMENT_INTENT_STATUSES = [
  'created',
  'pending_proof',
  'pending_reconciliation',
  'pending_provider',
  'confirmed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded',
] as const;

export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

export const PAYMENT_PURPOSES = ['deposit', 'full_fee', 'boost', 'subscription'] as const;

export type PaymentPurpose = (typeof PAYMENT_PURPOSES)[number];
