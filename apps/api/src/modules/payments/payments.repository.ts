import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { PaymentProviderCode } from '@mating/shared';

import { decodeCursor } from '../../common';
import type {
  BoostOrder,
  PaymentIntent,
  Subscription,
  SubscriptionPlan,
  WebhookEvent,
} from './entities/payment.entity';

export const PAYMENTS_REPOSITORY = 'PAYMENTS_REPOSITORY';

@Injectable()
export class InMemoryPaymentsRepository {
  private readonly intents = new Map<string, PaymentIntent>();
  private readonly intentIdempotency = new Map<string, string>();
  private readonly webhooks = new Map<string, WebhookEvent>();
  private readonly webhookIdempotency = new Map<string, string>();
  private readonly boostOrders = new Map<string, BoostOrder>();
  private readonly boostIdempotency = new Map<string, string>();
  private readonly subscriptions = new Map<string, Subscription>();
  private readonly subscriptionIdempotency = new Map<string, string>();
  private readonly plans = new Map<string, SubscriptionPlan>();

  seedPlan(plan: SubscriptionPlan): void {
    this.plans.set(plan.id, plan);
  }

  async findIntentById(id: string): Promise<PaymentIntent | null> {
    return this.intents.get(id) ?? null;
  }

  async findIntentByIdempotency(
    provider: PaymentProviderCode,
    idempotencyKey: string,
  ): Promise<PaymentIntent | null> {
    const id = this.intentIdempotency.get(`${provider}:${idempotencyKey}`);
    return id ? (this.intents.get(id) ?? null) : null;
  }

  async findIntentByProviderReference(
    providerReference: string,
  ): Promise<PaymentIntent | null> {
    for (const intent of this.intents.values()) {
      if (intent.providerReference === providerReference) return intent;
    }
    return null;
  }

  async createIntent(input: Omit<PaymentIntent, 'id' | 'createdAt' | 'updatedAt'>): Promise<PaymentIntent> {
    const now = new Date().toISOString();
    const intent: PaymentIntent = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.intents.set(intent.id, intent);
    this.intentIdempotency.set(`${intent.provider}:${intent.idempotencyKey}`, intent.id);
    return intent;
  }

  async updateIntent(
    id: string,
    patch: Partial<PaymentIntent>,
  ): Promise<PaymentIntent | null> {
    const existing = this.intents.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.intents.set(id, updated);
    return updated;
  }

  async listIntentsForPayer(
    payerId: string,
    filter: { status?: string; purpose?: string; cursor?: string; limit: number },
  ): Promise<PaymentIntent[]> {
    let rows = [...this.intents.values()].filter((i) => i.payerId === payerId);
    if (filter.status) rows = rows.filter((i) => i.status === filter.status);
    if (filter.purpose) rows = rows.filter((i) => i.purpose === filter.purpose);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async listIntentsAdmin(filter: {
    status?: string;
    provider?: string;
    cursor?: string;
    limit: number;
  }): Promise<PaymentIntent[]> {
    let rows = [...this.intents.values()];
    if (filter.status) rows = rows.filter((i) => i.status === filter.status);
    if (filter.provider) rows = rows.filter((i) => i.provider === filter.provider);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async insertWebhookEvent(
    input: Omit<WebhookEvent, 'id' | 'createdAt'>,
  ): Promise<{ event: WebhookEvent; inserted: boolean }> {
    const key = `${input.provider}:${input.providerEventId}`;
    const existingId = this.webhookIdempotency.get(key);
    if (existingId) {
      return { event: this.webhooks.get(existingId)!, inserted: false };
    }
    const event: WebhookEvent = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(event.id, event);
    this.webhookIdempotency.set(key, event.id);
    return { event, inserted: true };
  }

  async createBoostOrder(
    input: Omit<BoostOrder, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<BoostOrder> {
    const existingId = this.boostIdempotency.get(input.idempotencyKey);
    if (existingId) return this.boostOrders.get(existingId)!;

    const now = new Date().toISOString();
    const order: BoostOrder = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.boostOrders.set(order.id, order);
    this.boostIdempotency.set(input.idempotencyKey, order.id);
    return order;
  }

  async findBoostOrderById(id: string): Promise<BoostOrder | null> {
    return this.boostOrders.get(id) ?? null;
  }

  async findBoostOrderByIdempotency(key: string): Promise<BoostOrder | null> {
    const id = this.boostIdempotency.get(key);
    return id ? (this.boostOrders.get(id) ?? null) : null;
  }

  async updateBoostOrder(id: string, patch: Partial<BoostOrder>): Promise<BoostOrder | null> {
    const existing = this.boostOrders.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.boostOrders.set(id, updated);
    return updated;
  }

  async listBoostOrdersForBuyer(
    buyerId: string,
    filter: { status?: string; cursor?: string; limit: number },
  ): Promise<BoostOrder[]> {
    let rows = [...this.boostOrders.values()].filter((o) => o.buyerId === buyerId);
    if (filter.status) rows = rows.filter((o) => o.status === filter.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorTime = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorTime);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async listPlansByRegion(regionId: string): Promise<SubscriptionPlan[]> {
    return [...this.plans.values()].filter((p) => p.regionId === regionId && p.active);
  }

  async findPlanById(id: string): Promise<SubscriptionPlan | null> {
    return this.plans.get(id) ?? null;
  }

  async createSubscription(
    input: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Subscription> {
    const existingId = this.subscriptionIdempotency.get(input.idempotencyKey);
    if (existingId) return this.subscriptions.get(existingId)!;

    const now = new Date().toISOString();
    const sub: Subscription = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(sub.id, sub);
    this.subscriptionIdempotency.set(input.idempotencyKey, sub.id);
    return sub;
  }

  async findSubscriptionBySubscriber(subscriberId: string): Promise<Subscription | null> {
    const rows = [...this.subscriptions.values()]
      .filter((s) => s.subscriberId === subscriberId && s.status !== 'cancelled')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rows[0] ?? null;
  }

  async findSubscriptionById(id: string): Promise<Subscription | null> {
    return this.subscriptions.get(id) ?? null;
  }

  async findSubscriptionByIdempotency(key: string): Promise<Subscription | null> {
    const id = this.subscriptionIdempotency.get(key);
    return id ? (this.subscriptions.get(id) ?? null) : null;
  }

  async updateSubscription(id: string, patch: Partial<Subscription>): Promise<Subscription | null> {
    const existing = this.subscriptions.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.subscriptions.set(id, updated);
    return updated;
  }
}
