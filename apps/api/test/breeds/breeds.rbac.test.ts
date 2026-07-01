import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';

import { Reflector } from '@nestjs/core';

import type { UserRole } from '@mating/shared';

import { ROLES_KEY } from '../../src/common/auth/roles.decorator';
import { RolesGuard } from '../../src/common/auth/roles.guard';
import { AdminBreedsController } from '../../src/modules/breeds/breeds.controller';
import { canManageBreeds } from '../../src/modules/breeds/policies/breed.policy';
import { assertRoleMatrix, metadataReflector } from '../harness/rbac';

test('admin breed routes are gated to super_admin via @Roles metadata', () => {
  const required = new Reflector().get<UserRole[]>(ROLES_KEY, AdminBreedsController);
  assert.deepEqual(required, ['super_admin']);
});

test('only super_admin may manage the breed taxonomy; other roles get 403', async () => {
  await assertRoleMatrix({
    guardFor: (required) => new RolesGuard(metadataReflector({ [ROLES_KEY]: required })),
    required: ['super_admin'],
    allowed: [['super_admin']],
    denied: [['support_agent'], ['breeder'], ['animal_owner'], ['veterinarian'], []],
  });
});

test('canManageBreeds policy mirrors the route-level role gate', () => {
  assert.equal(canManageBreeds({ roles: ['super_admin'] }), true);
  assert.equal(canManageBreeds({ roles: ['breeder'] }), false);
  assert.equal(canManageBreeds({ roles: [] }), false);
});
