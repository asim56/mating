export const PAYMENT_PROVIDER_CODES = [
  'bank_transfer',
  'easypaisa',
  'jazzcash',
  'stripe',
] as const;

export type PaymentProviderCode = (typeof PAYMENT_PROVIDER_CODES)[number];

export const PAYOUT_PROVIDER_CODES = [
  'bank_transfer',
  'easypaisa',
  'jazzcash',
  'stripe_connect',
] as const;

export type PayoutProviderCode = (typeof PAYOUT_PROVIDER_CODES)[number];
