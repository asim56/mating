import assert from 'node:assert/strict';

import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRole } from '@mating/shared';

import { ApiError } from '../../src/common/errors/api-error';
import type { ErrorCode } from '../../src/common/errors/error-codes';
import type { AuthenticatedUser } from '../../src/common/auth/roles.decorator';

export type MockRequest = {
  headers: Record<string, string>;
  user?: AuthenticatedUser;
  ip: string;
  res: { setHeader: (name: string, value: string | number) => void };
};

/** Reflector stub returning preconfigured metadata per key. */
export function metadataReflector(meta: Record<string, unknown>): Reflector {
  return {
    getAllAndOverride: (key: string) => meta[key],
    get: (key: string) => meta[key],
  } as unknown as Reflector;
}

/** Builds a mock {@link ExecutionContext} for guard unit tests. */
export function makeExecutionContext(request: Partial<MockRequest> = {}): {
  ctx: ExecutionContext;
  request: MockRequest;
} {
  const fullRequest: MockRequest = {
    headers: request.headers ?? {},
    user: request.user,
    ip: request.ip ?? '127.0.0.1',
    res: request.res ?? { setHeader: () => undefined },
  };
  const ctx = {
    getHandler: () => function handler() {},
    getClass: () => class HarnessController {},
    switchToHttp: () => ({
      getRequest: () => fullRequest,
      getResponse: () => fullRequest.res,
    }),
  } as unknown as ExecutionContext;
  return { ctx, request: fullRequest };
}

/** Asserts a guard grants access for the given context. */
export async function expectGranted(guard: CanActivate, ctx: ExecutionContext): Promise<void> {
  const result = guard.canActivate(ctx);
  assert.equal(await Promise.resolve(result), true);
}

/** Asserts a guard denies access with the expected stable error code. */
export async function expectDenied(
  guard: CanActivate,
  ctx: ExecutionContext,
  expectedCode: ErrorCode,
): Promise<void> {
  await assert.rejects(
    async () => {
      const result = guard.canActivate(ctx);
      await Promise.resolve(result);
    },
    (error: unknown) => {
      assert.ok(error instanceof ApiError, 'expected an ApiError');
      assert.equal(error.code, expectedCode);
      return true;
    },
  );
}

/**
 * Asserts a role-matrix: every role in `allowed` is granted and every role in
 * `denied` is rejected by the supplied guard for the given required roles.
 */
export async function assertRoleMatrix(options: {
  guardFor: (required: UserRole[]) => CanActivate;
  required: UserRole[];
  allowed: UserRole[][];
  denied: UserRole[][];
}): Promise<void> {
  for (const roles of options.allowed) {
    const guard = options.guardFor(options.required);
    const { ctx } = makeExecutionContext({ user: { id: 'u', roles } });
    await expectGranted(guard, ctx);
  }
  for (const roles of options.denied) {
    const guard = options.guardFor(options.required);
    const { ctx } = makeExecutionContext({ user: { id: 'u', roles } });
    await expectDenied(guard, ctx, 'FORBIDDEN');
  }
}
