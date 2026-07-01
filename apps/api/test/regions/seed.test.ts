import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { REGION_DEFINITIONS } from '@mating/shared';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const MIGRATION = readFileSync(
  resolve(REPO_ROOT, 'supabase/migrations/20250701000000_regions.sql'),
  'utf8',
);
const SEED = readFileSync(resolve(REPO_ROOT, 'supabase/seed.sql'), 'utf8');

test('regions migration creates the table with a jsonb config column', () => {
  assert.match(MIGRATION, /create table if not exists public\.regions/);
  assert.match(MIGRATION, /config jsonb not null/);
  assert.match(MIGRATION, /currency_code text not null/);
  assert.match(MIGRATION, /default_locale text not null/);
  assert.match(MIGRATION, /active boolean not null/);
});

test('regions migration enables RLS with a public read policy for active regions', () => {
  assert.match(MIGRATION, /alter table public\.regions enable row level security/);
  assert.match(MIGRATION, /create policy regions_read_active/);
  assert.match(MIGRATION, /using \(active = true\)/);
});

test('seed inserts both PK and US region rows', () => {
  assert.match(SEED, /insert into public\.regions/);
  assert.match(SEED, /'PK'/);
  assert.match(SEED, /'US'/);
});

test('seeded PK/US currency, locale, and active flag match the canonical shared defaults', () => {
  // PK: PKR, en, active.
  assert.equal(REGION_DEFINITIONS.PK.currencyCode, 'PKR');
  assert.ok(SEED.includes("'PKR'"), 'seed includes PK currency');
  assert.match(SEED, /array\['en', 'ur'\]/);

  // US: USD, dual-launch active.
  assert.equal(REGION_DEFINITIONS.US.currencyCode, 'USD');
  assert.ok(SEED.includes("'USD'"), 'seed includes US currency');
  assert.equal(REGION_DEFINITIONS.US.active, true);
  assert.equal(REGION_DEFINITIONS.PK.active, true);
});

test('seeded jsonb config carries eligibility, compliance, and payment methods', () => {
  assert.match(SEED, /"eligibility"/);
  assert.match(SEED, /"compliance"/);
  assert.match(SEED, /"paymentMethods"/);

  for (const method of REGION_DEFINITIONS.PK.config.paymentMethods) {
    assert.ok(SEED.includes(`"${method}"`), `seed includes PK payment method ${method}`);
  }
  assert.ok(SEED.includes('"stripe"'), 'seed includes US Stripe method');

  // Conservative PK cattle minimum (18 months) is present in the config payload.
  assert.equal(REGION_DEFINITIONS.PK.config.eligibility.species.cattle?.minAgeMonths, 18);
  assert.match(SEED, /"cattle":\s*\{\s*"minAgeMonths":\s*18/);
});
