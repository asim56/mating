import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { ApiEnv } from '@mating/config';
import type {
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  PaymentProviderEvent,
  RefundInput,
  RefundResult,
  VerifyWebhookInput,
} from '@mating/shared';

export function verifyStubSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const body = typeof payload === 'string' ? payload : payload.toString('utf8');
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function parseStubWebhookPayload(body: string): {
  eventId: string;
  providerReference: string;
  status: string;
  amount: number;
  currencyCode: string;
} {
  const parsed = JSON.parse(body) as Record<string, unknown>;
  return {
    eventId: String(parsed.eventId),
    providerReference: String(parsed.providerReference),
    status: String(parsed.status),
    amount: Number(parsed.amount),
    currencyCode: String(parsed.currencyCode),
  };
}

export class EasypaisaStubProvider implements PaymentProvider {
  constructor(private readonly secret: string) {}

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      id: randomUUID(),
      providerReference: `ep_${input.idempotencyKey}`,
      status: 'pending_provider',
      checkoutUrl: `https://stub.easypaisa.local/checkout/${input.idempotencyKey}`,
    };
  }

  async verifyWebhook(input: VerifyWebhookInput): Promise<PaymentProviderEvent> {
    const signature = input.headers['x-payment-signature'] ?? '';
    const body = typeof input.payload === 'string' ? input.payload : input.payload.toString('utf8');
    if (!verifyStubSignature(body, signature, this.secret)) {
      throw new Error('Invalid signature');
    }
    const parsed = parseStubWebhookPayload(body);
    return {
      providerReference: parsed.providerReference,
      status: parsed.status === 'succeeded' ? 'confirmed' : 'failed',
      amount: parsed.amount,
      currencyCode: parsed.currencyCode,
      metadata: { eventId: parsed.eventId },
    };
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { id: randomUUID(), status: 'refunded' };
  }
}

export class JazzcashStubProvider extends EasypaisaStubProvider {}
export class StripeStubProvider extends EasypaisaStubProvider {}

export class BankTransferAdapter implements PaymentProvider {
  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      id: randomUUID(),
      providerReference: `bt_${input.idempotencyKey}`,
      status: 'created',
    };
  }

  async verifyWebhook(): Promise<PaymentProviderEvent> {
    throw new Error('Bank transfer does not use webhooks');
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    return { id: randomUUID(), status: 'refunded' };
  }
}

export class PaymentProviderFactory {
  constructor(private readonly env: ApiEnv) {}

  resolve(provider: string): PaymentProvider {
    const secret = this.env.PAYMENT_STUB_SECRET ?? 'dev-payment-stub-secret';
    switch (provider) {
      case 'easypaisa':
        return new EasypaisaStubProvider(secret);
      case 'jazzcash':
        return new JazzcashStubProvider(secret);
      case 'stripe':
        return new StripeStubProvider(secret);
      case 'bank_transfer':
        return new BankTransferAdapter();
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
