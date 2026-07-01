import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { ADMIN, PAYEE, PAYER, seedPaymentsFixture } from '../payments/fixtures';

test('payout idempotency and balance validation', async () => {
  const ctx = await seedPaymentsFixture();

  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 10000,
      currencyCode: 'PKR',
      provider: 'bank_transfer',
      requestId: ctx.request.id,
      payeeId: PAYEE.id,
      idempotencyKey: 'payout-bal-1',
    },
    PAYER,
  );
  await ctx.payments.attachProof(intent.id, PAYER, `${PAYER.id}/${intent.id}/proof.jpg`);
  await ctx.payments.reconcile(intent.id, ADMIN);

  const account = await ctx.wallet.createPayoutAccount(
    {
      provider: 'bank_transfer',
      accountType: 'bank_account',
      accountReference: 'PK00HABB1234567890',
    },
    PAYEE,
  );

  await assert.rejects(
    () =>
      ctx.wallet.requestPayout(
        {
          payoutAccountId: account.id,
          amount: 50000,
          currencyCode: 'PKR',
          idempotencyKey: 'payout-too-much',
        },
        PAYEE,
      ),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );

  const payout = await ctx.wallet.requestPayout(
    {
      payoutAccountId: account.id,
      amount: 5000,
      currencyCode: 'PKR',
      idempotencyKey: 'payout-1',
    },
    PAYEE,
  );
  const duplicate = await ctx.wallet.requestPayout(
    {
      payoutAccountId: account.id,
      amount: 5000,
      currencyCode: 'PKR',
      idempotencyKey: 'payout-1',
    },
    PAYEE,
  );
  assert.equal(payout.id, duplicate.id);
});
