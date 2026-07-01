import assert from 'node:assert/strict';
import test from 'node:test';

import { API_PREFIX, API_VERSION } from './constants';

test('API constants are stable', () => {
  assert.equal(API_VERSION, 'v1');
  assert.equal(API_PREFIX, '/api/v1');
});
