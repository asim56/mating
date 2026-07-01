import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const LEDGER_MIGRATION = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20250901000300_ledger_entries.sql'),
  'utf8',
);

const WEBHOOK_MIGRATION = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20250901000000_payment_intents_webhook_events.sql'),
  'utf8',
);

test('ledger_entries migration revokes update/delete from authenticated', () => {
  assert.match(LEDGER_MIGRATION, /revoke update, delete on public\.ledger_entries from authenticated/);
});

test('webhook_events migration revokes update/delete from authenticated', () => {
  assert.match(WEBHOOK_MIGRATION, /revoke update, delete on public\.webhook_events from authenticated/);
});
