import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { SubscriptionsService } from '../../src/modules/payments/subscriptions.service';
import { PAYEE, PAYER, seedPaymentsFixture } from './fixtures';

test('subscription create and cancel at period end', async () => {
  const ctx = await seedPaymentsFixture();
  const subscriptions = new SubscriptionsService(ctx.paymentsRepo, ctx.payments, ctx.audit);

  const created = await subscriptions.create(
    { planId: 'plan-pk', provider: 'bank_transfer', idempotencyKey: 'sub-1' },
    PAYEE,
  );
  assert.ok(created.subscription);
  assert.ok(created.paymentIntent);

  const cancelled = await subscriptions.cancelAtPeriodEnd(created.subscription.id, PAYEE);
  assert.equal(cancelled.cancelAtPeriodEnd, true);
});

test('duplicate subscription idempotency returns existing', async () => {
  const ctx = await seedPaymentsFixture();
  const subscriptions = new SubscriptionsService(ctx.paymentsRepo, ctx.payments, ctx.audit);
  const dto = { planId: 'plan-pk', provider: 'bank_transfer' as const, idempotencyKey: 'sub-dup' };
  const first = await subscriptions.create(dto, PAYER);
  const second = await subscriptions.create(dto, PAYER);
  assert.equal(first.subscription.id, second.subscription.id);
});
