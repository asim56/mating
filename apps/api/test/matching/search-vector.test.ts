import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('discovery migration defines search_vector trigger', () => {
  const sql = readFileSync(
    new URL('../../../../supabase/migrations/20250802000000_discovery.sql', import.meta.url),
    'utf8',
  );
  assert.match(sql, /listings_search_vector_trg/);
  assert.match(sql, /listings_search_vector_update/);
  assert.match(sql, /listings_search_idx/);
});
