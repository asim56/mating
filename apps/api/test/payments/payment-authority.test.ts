import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { PAYER, seedPaymentsFixture } from './fixtures';

test('no client confirm endpoint exists on payments service', async () => {
  const ctx = await seedPaymentsFixture();
  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 500,
      currencyCode: 'PKR',
      provider: 'bank_transfer',
      idempotencyKey: 'no-self-confirm',
    },
    PAYER,
  );

  const service = ctx.payments as unknown as Record<string, unknown>;
  assert.equal(typeof service.confirmByClient, 'undefined');

  await assert.rejects(
    () => ctx.payments.reconcile(intent.id, PAYER),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});
