import assert from 'node:assert/strict';
import test from 'node:test';

import { MIGRATIONS_DIR } from './index';

test('migrations directory path is defined', () => {
  assert.equal(MIGRATIONS_DIR, 'supabase/migrations');
});
