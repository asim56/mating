import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';

import { Reflector } from '@nestjs/core';

import type { UserRole } from '@mating/shared';

import { JwtAuthGuard } from '../../src/common/auth/jwt.guard';
import { ROLES_KEY } from '../../src/common/auth/roles.decorator';
import { RolesGuard } from '../../src/common/auth/roles.guard';
import { AdminRegionsController } from '../../src/modules/regions/regions.controller';
import {
  assertRoleMatrix,
  expectDenied,
  expectGranted,
  makeExecutionContext,
  metadataReflector,
} from '../harness/rbac';
import { signTestToken } from '../harness/fixtures';

test('admin region routes are gated to super_admin via @Roles metadata', () => {
  const required = new Reflector().get<UserRole[]>(ROLES_KEY, AdminRegionsController);
  assert.deepEqual(required, ['super_admin']);
});

test('only super_admin may manage region config; other roles get 403', async () => {
  await assertRoleMatrix({
    guardFor: (required) => new RolesGuard(metadataReflector({ [ROLES_KEY]: required })),
    required: ['super_admin'],
    allowed: [['super_admin']],
    denied: [['support_agent'], ['breeder'], ['animal_owner'], ['veterinarian'], []],
  });
});

test('JwtAuthGuard rejects a missing token with 401', async () => {
  const guard = new JwtAuthGuard(metadataReflector({}));
  const { ctx } = makeExecutionContext({ headers: {} });
  await expectDenied(guard, ctx, 'UNAUTHENTICATED');
});

test('JwtAuthGuard accepts a structurally valid token and attaches the principal', async () => {
  const guard = new JwtAuthGuard(metadataReflector({}));
  const token = signTestToken({ sub: 'user-super-admin', roles: ['super_admin'] });
  const { ctx, request } = makeExecutionContext({ headers: { authorization: `Bearer ${token}` } });

  await expectGranted(guard, ctx);
  assert.equal(request.user?.id, 'user-super-admin');
  assert.deepEqual(request.user?.roles, ['super_admin']);
});
