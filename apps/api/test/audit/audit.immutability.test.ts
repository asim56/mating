import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { PASSWORD_MIN_LENGTH } from '@mating/shared';

const MIGRATION = readFileSync(
  resolve(__dirname, '../../../../supabase/migrations/20250703000000_identity_m1.sql'),
  'utf8',
);

test('audit_logs migration revokes update/delete from authenticated', () => {
  assert.match(MIGRATION, /revoke update, delete on public\.audit_logs from authenticated/);
});

test('audit_logs table is append-only by grant design', () => {
  assert.match(MIGRATION, /create table if not exists public\.audit_logs/);
  assert.match(MIGRATION, /alter table public\.audit_logs enable row level security/);
});

test('password minimum length matches contract', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 10);
});
