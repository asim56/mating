import assert from 'node:assert/strict';
import test from 'node:test';

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiError } from '../../src/common/errors/api-error';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { JwtAuthGuard } from '../../src/common/auth/jwt.guard';
import { RolesGuard } from '../../src/common/auth/roles.guard';
import { ROLES_KEY, type AuthenticatedUser } from '../../src/common/auth/roles.decorator';
import { OwnershipPolicy } from '../../src/common/auth/ownership-policy.base';
import { signTestToken } from '../harness/fixtures';

type RequestShape = { headers?: Record<string, string>; user?: AuthenticatedUser };

class NoopController {}
const noopHandler = function handler() {};

function makeContext(request: RequestShape): ExecutionContext {
  return {
    getHandler: () => noopHandler,
    getClass: () => NoopController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

test('JwtAuthGuard rejects a missing Authorization header with 401', async () => {
  const guard = new JwtAuthGuard(new Reflector());
  await assert.rejects(
    async () => guard.canActivate(makeContext({ headers: {} })),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.UNAUTHENTICATED);
      assert.equal(error.getStatus(), 401);
      return true;
    },
  );
});

test('JwtAuthGuard rejects a malformed token with 401', async () => {
  const guard = new JwtAuthGuard(new Reflector());
  await assert.rejects(
    async () =>
      guard.canActivate(makeContext({ headers: { authorization: 'Bearer not-a-jwt' } })),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.getStatus(), 401);
      return true;
    },
  );
});

test('JwtAuthGuard attaches the verified user for a valid token', async () => {
  const guard = new JwtAuthGuard(new Reflector());
  const request: RequestShape = {
    headers: { authorization: `Bearer ${signTestToken({ sub: 'user-1', roles: ['breeder'] })}` },
  };

  assert.equal(await guard.canActivate(makeContext(request)), true);
  assert.equal(request.user?.id, 'user-1');
  assert.deepEqual(request.user?.roles, ['breeder']);
});

function rolesReflector(required: string[]): Reflector {
  return {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? required : undefined),
  } as unknown as Reflector;
}

test('RolesGuard allows when no roles are required', () => {
  const guard = new RolesGuard(rolesReflector([]));
  assert.equal(guard.canActivate(makeContext({ user: { id: 'u', roles: [] } })), true);
});

test('RolesGuard returns 403 for insufficient role', () => {
  const guard = new RolesGuard(rolesReflector(['super_admin']));
  assert.throws(
    () => guard.canActivate(makeContext({ user: { id: 'u', roles: ['breeder'] } })),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.FORBIDDEN);
      assert.equal(error.getStatus(), 403);
      return true;
    },
  );
});

test('RolesGuard allows when the user holds a required role', () => {
  const guard = new RolesGuard(rolesReflector(['super_admin', 'support_agent']));
  assert.equal(
    guard.canActivate(makeContext({ user: { id: 'u', roles: ['support_agent'] } })),
    true,
  );
});

class AnimalPolicy extends OwnershipPolicy<{ ownerId: string }> {
  protected getOwnerId(resource: { ownerId: string }): string {
    return resource.ownerId;
  }
}

test('OwnershipPolicy permits owners and admins, blocks others', () => {
  const policy = new AnimalPolicy();
  const resource = { ownerId: 'owner-1' };

  assert.equal(policy.canAccess({ id: 'owner-1', roles: [] }, resource), true);
  assert.equal(policy.canAccess({ id: 'admin', roles: ['super_admin'] }, resource), true);
  assert.equal(policy.canAccess({ id: 'intruder', roles: ['breeder'] }, resource), false);

  assert.throws(
    () => policy.assertCanAccess({ id: 'intruder', roles: ['breeder'] }, resource),
    (error: unknown) => error instanceof ApiError && error.getStatus() === 403,
  );
});
