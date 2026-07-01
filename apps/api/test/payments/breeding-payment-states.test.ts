import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { PAYEE, PAYER, seedPaymentsFixture } from './fixtures';

test('accept with fee moves to PaymentPending; confirm moves to Scheduled', async () => {
  const ctx = await seedPaymentsFixture();
  const accepted = await ctx.breeding.accept(ctx.request.id, PAYEE);
  assert.equal(accepted.status, 'PaymentPending');
  assert.equal(accepted.feeAmount, 5000);

  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 5000,
      currencyCode: 'PKR',
      provider: 'bank_transfer',
      requestId: ctx.request.id,
      idempotencyKey: 'breeding-state-1',
    },
    PAYER,
  );

  await ctx.payments.attachProof(intent.id, PAYER, `${PAYER.id}/${intent.id}/proof.jpg`);
  await ctx.payments.reconcile(intent.id, { id: 'admin', roles: ['super_admin'] });

  const updated = (await ctx.breedingRepo.findById(ctx.request.id))!;
  assert.equal(updated.status, 'Scheduled');
});

test('illegal PaymentPending to Completed is rejected', async () => {
  const ctx = await seedPaymentsFixture();
  await ctx.breeding.accept(ctx.request.id, PAYEE);

  await assert.rejects(
    () => ctx.breeding.complete(ctx.request.id, PAYER),
    (err: unknown) => err instanceof ApiError && err.code === 'INVALID_STATE_TRANSITION',
  );
});
