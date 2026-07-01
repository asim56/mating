import assert from 'node:assert/strict';
import test from 'node:test';

import { LedgerWriterService } from '../../src/modules/wallet-ledger/ledger-writer.service';
import { InMemoryLedgerRepository } from '../../src/modules/wallet-ledger/ledger.repository';

test('ledger writer produces balanced double-entry per transaction', async () => {
  const repo = new InMemoryLedgerRepository();
  const writer = new LedgerWriterService(repo);

  const entries = await writer.writePaymentConfirmed({
    paymentIntentId: 'intent-1',
    entryType: 'payment_confirmed',
    amount: 5000,
    currencyCode: 'PKR',
    payerId: 'payer',
    payeeId: 'payee',
  });

  const txId = entries[0]!.transactionId;
  const sameTx = entries.filter((e) => e.transactionId === txId);
  const debits = sameTx.filter((e) => e.direction === 'debit').reduce((s, e) => s + e.amount, 0);
  const credits = sameTx.filter((e) => e.direction === 'credit').reduce((s, e) => s + e.amount, 0);
  assert.equal(debits, credits);
});
