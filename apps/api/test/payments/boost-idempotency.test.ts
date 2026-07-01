import assert from 'node:assert/strict';
import test from 'node:test';

import { PAYEE, seedPaymentsFixture } from './fixtures';

test('boost purchase idempotency returns same order', async () => {
  const ctx = await seedPaymentsFixture();
  const key = 'boost-dup-1';
  const first = await ctx.paymentsRepo.createBoostOrder({
    listingId: ctx.listing.id,
    buyerId: PAYEE.id,
    paymentIntentId: null,
    boostType: 'featured_7d',
    status: 'pending',
    startsAt: null,
    endsAt: null,
    amount: 1500,
    currencyCode: 'PKR',
    idempotencyKey: key,
  });
  const second = await ctx.paymentsRepo.createBoostOrder({
    listingId: ctx.listing.id,
    buyerId: PAYEE.id,
    paymentIntentId: null,
    boostType: 'featured_7d',
    status: 'pending',
    startsAt: null,
    endsAt: null,
    amount: 1500,
    currencyCode: 'PKR',
    idempotencyKey: key,
  });
  assert.equal(first.id, second.id);
});
