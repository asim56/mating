import assert from 'node:assert/strict';
import test from 'node:test';

import { ADMIN, PAYEE, PAYER, seedPaymentsFixture } from './fixtures';

test('bank transfer flow: intent → proof → reconcile → ledger', async () => {
  const ctx = await seedPaymentsFixture();
  await ctx.breeding.accept(ctx.request.id, PAYEE);
  const accepted = (await ctx.breedingRepo.findById(ctx.request.id))!;
  assert.equal(accepted.status, 'PaymentPending');

  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 5000,
      currencyCode: 'PKR',
      provider: 'bank_transfer',
      requestId: ctx.request.id,
      idempotencyKey: 'bank-flow-1',
    },
    PAYER,
  );
  assert.equal(intent.status, 'created');

  await ctx.payments.createProofUploadUrl(intent.id, PAYER, {
    contentType: 'image/jpeg',
    filename: 'proof.jpg',
  });
  const updated = await ctx.payments.attachProof(
    intent.id,
    PAYER,
    `${PAYER.id}/${intent.id}/proof.jpg`,
  );
  assert.equal(updated!.status, 'pending_reconciliation');

  const confirmed = await ctx.payments.reconcile(intent.id, ADMIN);
  assert.equal(confirmed.status, 'confirmed');

  const entries = ctx.ledgerRepo.getAllEntries();
  assert.ok(entries.length >= 2);
  assert.ok(entries.every((e) => e.paymentIntentId === intent.id));

  const request = (await ctx.breedingRepo.findById(ctx.request.id))!;
  assert.equal(request.status, 'Scheduled');
});

test('duplicate idempotency key returns same intent', async () => {
  const ctx = await seedPaymentsFixture();
  const dto = {
    purpose: 'deposit' as const,
    amount: 1000,
    currencyCode: 'PKR',
    provider: 'bank_transfer' as const,
    idempotencyKey: 'dup-key-1',
  };
  const first = await ctx.payments.createIntent(dto, PAYER);
  const second = await ctx.payments.createIntent(dto, PAYER);
  assert.equal(first.id, second.id);
});
