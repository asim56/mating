import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import { PAYEE, PAYER, seedPaymentsFixture } from './fixtures';

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

test('webhook replay is idempotent with zero duplicate ledger rows', async () => {
  const ctx = await seedPaymentsFixture();
  const intent = await ctx.payments.createIntent(
    {
      purpose: 'deposit',
      amount: 2000,
      currencyCode: 'PKR',
      provider: 'easypaisa',
      idempotencyKey: 'webhook-dedup-1',
    },
    PAYER,
  );

  const body = JSON.stringify({
    eventId: 'evt_123',
    providerReference: intent.providerReference,
    status: 'succeeded',
    amount: 2000,
    currencyCode: 'PKR',
  });
  const signature = sign(body, 'test-secret');

  const first = await ctx.payments.processWebhook('easypaisa', body, signature);
  assert.equal(first.status, 'processed');
  const countAfterFirst = ctx.ledgerRepo.getAllEntries().length;

  const second = await ctx.payments.processWebhook('easypaisa', body, signature);
  assert.equal(second.status, 'duplicate_ignored');
  assert.equal(ctx.ledgerRepo.getAllEntries().length, countAfterFirst);
});
