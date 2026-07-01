import type {
  PaymentIntentStatus,
  PaymentProviderCode,
  PaymentPurpose,
} from '@mating/shared';

export type PaymentIntent = {
  id: string;
  requestId: string | null;
  payerId: string;
  payeeId: string | null;
  provider: PaymentProviderCode;
  providerReference: string | null;
  purpose: PaymentPurpose;
  status: PaymentIntentStatus;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type WebhookEvent = {
  id: string;
  provider: PaymentProviderCode;
  providerEventId: string;
  paymentIntentId: string | null;
  payloadHash: string;
  status: 'processed' | 'ignored' | 'failed';
  processedAt: string;
  createdAt: string;
};

export type BoostOrder = {
  id: string;
  listingId: string;
  buyerId: string;
  paymentIntentId: string | null;
  boostType: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startsAt: string | null;
  endsAt: string | null;
  amount: number;
  currencyCode: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};

export type SubscriptionPlan = {
  id: string;
  regionId: string;
  code: string;
  name: string;
  interval: 'month' | 'year';
  amount: number;
  currencyCode: string;
  features: Record<string, unknown>;
  active: boolean;
};

export type Subscription = {
  id: string;
  subscriberId: string;
  planId: string;
  paymentIntentId: string | null;
  provider: PaymentProviderCode | null;
  providerReference: string | null;
  status: 'active' | 'past_due' | 'cancelled';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
};
