import assert from 'node:assert/strict';
import test from 'node:test';

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiError } from '../../src/common/errors/api-error';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { RATE_LIMITS } from '../../src/common/rate-limit/rate-limit.config';
import { FixedWindowStore, RateLimitGuard } from '../../src/common/rate-limit/rate-limit.guard';

test('rate-limit matrix defines all required buckets', () => {
  for (const category of ['default', 'auth', 'search', 'messaging', 'request_creation'] as const) {
    assert.ok(RATE_LIMITS[category].limit > 0);
    assert.ok(RATE_LIMITS[category].windowSeconds > 0);
  }
});

test('FixedWindowStore allows up to the limit then blocks with a retry hint', () => {
  let clock = 0;
  const store = new FixedWindowStore(() => clock);
  const rule = { limit: 2, windowSeconds: 60 };

  assert.equal(store.hit('k', rule).allowed, true);
  assert.equal(store.hit('k', rule).allowed, true);

  const blocked = store.hit('k', rule);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds > 0);

  clock += 60_000;
  assert.equal(store.hit('k', rule).allowed, true);
});

function makeContext(headers: Record<string, string> = {}): {
  ctx: ExecutionContext;
  headersSet: Record<string, string | number>;
} {
  const headersSet: Record<string, string | number> = {};
  const request = {
    ip: '10.0.0.1',
    headers,
    res: {
      setHeader: (name: string, value: string | number) => {
        headersSet[name] = value;
      },
    },
  };
  const ctx = {
    getHandler: () => function handler() {},
    getClass: () => class NoopController {},
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, headersSet };
}

test('RateLimitGuard returns 429 with retry hint once the threshold is exceeded', () => {
  const store = new FixedWindowStore();
  const guard = new RateLimitGuard(new Reflector(), store);
  const { ctx, headersSet } = makeContext();

  // default bucket limit is 100; exhaust it.
  for (let i = 0; i < RATE_LIMITS.default.limit; i += 1) {
    assert.equal(guard.canActivate(ctx), true);
  }

  assert.throws(
    () => guard.canActivate(ctx),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.RATE_LIMITED);
      assert.equal(error.getStatus(), 429);
      return true;
    },
  );
  assert.ok('Retry-After' in headersSet);
});
