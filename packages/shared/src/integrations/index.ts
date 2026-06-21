export type CreatePaymentIntentInput = {
  amount: number;
  currencyCode: string;
  purpose: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type PaymentIntentResult = {
  id: string;
  providerReference: string;
  status: string;
  checkoutUrl?: string;
};

export type VerifyWebhookInput = {
  payload: string | Buffer;
  signature: string;
  headers: Record<string, string>;
};

export type PaymentProviderEvent = {
  providerReference: string;
  status: string;
  amount: number;
  currencyCode: string;
  metadata?: Record<string, unknown>;
};

export type RefundInput = {
  paymentIntentId: string;
  amount?: number;
  reason: string;
  idempotencyKey: string;
};

export type RefundResult = {
  id: string;
  status: string;
};

export interface PaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<PaymentProviderEvent>;
  refund(input: RefundInput): Promise<RefundResult>;
}

export type NotificationChannel = 'email' | 'sms' | 'push';

export type NotificationInput = {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  data: Record<string, unknown>;
};

export type NotificationResult = {
  id: string;
  status: 'queued' | 'sent' | 'failed';
};

export interface NotificationProvider {
  send(input: NotificationInput): Promise<NotificationResult>;
}

export type SignedUploadInput = {
  bucket: string;
  path: string;
  contentType: string;
  expiresInSeconds?: number;
};

export type SignedReadInput = {
  bucket: string;
  path: string;
  expiresInSeconds?: number;
};

export type SignedUrlResult = {
  url: string;
  expiresAt: string;
};

export interface StorageProvider {
  createSignedUploadUrl(input: SignedUploadInput): Promise<SignedUrlResult>;
  createSignedReadUrl(input: SignedReadInput): Promise<SignedUrlResult>;
}
