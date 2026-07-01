import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { ADMIN, PAYEE, PAYER, seedPaymentsFixture } from '../payments/fixtures';

test('refund without reasonCode is rejected', async () => {
  const ctx = await seedPaymentsFixture();
  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 1000,
      currencyCode: 'PKR',
      provider: 'bank_transfer',
      payeeId: PAYEE.id,
      idempotencyKey: 'refund-no-reason',
    },
    PAYER,
  );
  await ctx.payments.attachProof(intent.id, PAYER, `${PAYER.id}/${intent.id}/proof.jpg`);
  await ctx.payments.reconcile(intent.id, ADMIN);

  await assert.rejects(
    () => ctx.adminPayments.refund(intent.id, ADMIN, { reasonCode: '' }),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});
