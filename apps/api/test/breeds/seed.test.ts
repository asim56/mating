import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { BREED_DEFINITIONS } from '@mating/shared';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const MIGRATION = readFileSync(
  resolve(REPO_ROOT, 'supabase/migrations/20250702000000_breeds.sql'),
  'utf8',
);
const SEED = readFileSync(resolve(REPO_ROOT, 'supabase/seed.sql'), 'utf8');

test('breeds migration creates the table with a region foreign key', () => {
  assert.match(MIGRATION, /create table if not exists public\.breeds/);
  assert.match(MIGRATION, /references public\.regions \(code\)/);
  assert.match(MIGRATION, /species text not null/);
  assert.match(MIGRATION, /name text not null/);
  assert.match(MIGRATION, /active boolean not null/);
});

test('breeds migration enforces the (species, name, region) unique constraint', () => {
  assert.match(MIGRATION, /unique \(species, name, region_code\)/);
});

test('breeds migration enables RLS with a public read policy for active breeds', () => {
  assert.match(MIGRATION, /alter table public\.breeds enable row level security/);
  assert.match(MIGRATION, /create policy breeds_read_active/);
  assert.match(MIGRATION, /using \(active = true\)/);
});

test('seed inserts breeds after regions (FK order) for every priority species', () => {
  const regionsIdx = SEED.indexOf('insert into public.regions');
  const breedsIdx = SEED.indexOf('insert into public.breeds');
  assert.ok(
    regionsIdx > -1 && breedsIdx > -1 && regionsIdx < breedsIdx,
    'breeds seeded after regions',
  );

  for (const species of ['cattle', 'buffalo', 'goat', 'sheep', 'dog']) {
    assert.ok(SEED.includes(`'${species}'`), `seed includes ${species} breeds`);
  }
});

test('seed upserts on the natural key and contains the canonical breed names', () => {
  assert.match(SEED, /on conflict \(species, name, region_code\) do update/);

  for (const breed of BREED_DEFINITIONS) {
    assert.ok(SEED.includes(`'${breed.name}'`), `seed includes breed ${breed.name}`);
  }
});
