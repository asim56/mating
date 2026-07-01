import assert from 'node:assert/strict';
import test from 'node:test';

import { RATE_LIMITS } from '../../src/common/rate-limit/rate-limit.config';

test('search rate-limit category is configured', () => {
  assert.equal(RATE_LIMITS.search.limit, 60);
  assert.equal(RATE_LIMITS.search.windowSeconds, 60);
});
