import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { PAYER, seedPaymentsFixture } from './fixtures';

test('invalid webhook signature is rejected', async () => {
  const ctx = await seedPaymentsFixture();
  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 1000,
      currencyCode: 'PKR',
      provider: 'easypaisa',
      idempotencyKey: 'sig-test-1',
    },
    PAYER,
  );

  const body = JSON.stringify({
    eventId: 'evt_bad',
    providerReference: intent.providerReference,
    status: 'succeeded',
    amount: 1000,
    currencyCode: 'PKR',
  });

  await assert.rejects(
    () => ctx.payments.processWebhook('easypaisa', body, 'bad-signature'),
    (err: unknown) => err instanceof ApiError && err.code === 'UNAUTHENTICATED',
  );
});
