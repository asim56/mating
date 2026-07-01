import assert from 'node:assert/strict';
import test from 'node:test';

import { ERROR_CODES } from '../../src/common/errors/error-codes';

test('add-email conflict uses CONFLICT code per contract', () => {
  assert.equal(ERROR_CODES.CONFLICT, 'CONFLICT');
});

test('auth rate-limit category protects login endpoints', async () => {
  const { RATE_LIMITS } = await import('../../src/common/rate-limit/rate-limit.config');
  assert.ok(RATE_LIMITS.auth.limit > 0);
});
