import assert from 'node:assert/strict';
import test from 'node:test';

import { PK_PHONE_REGEX } from '@mating/shared';

test('PK phone validation pattern rejects non-PK numbers', () => {
  assert.match('+923001234567', PK_PHONE_REGEX);
  assert.doesNotMatch('03001234567', PK_PHONE_REGEX);
  assert.doesNotMatch('+12025550123', PK_PHONE_REGEX);
});

test('auth rate-limit category is configured', async () => {
  const { RATE_LIMITS } = await import('../../src/common/rate-limit/rate-limit.config');
  assert.equal(RATE_LIMITS.auth.limit, 10);
  assert.equal(RATE_LIMITS.auth.windowSeconds, 60);
});
