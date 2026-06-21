import assert from 'node:assert/strict';
import test from 'node:test';

import { API_PREFIX } from '@mating/shared';

test('API uses versioned prefix', () => {
  assert.equal(API_PREFIX, '/api/v1');
});
