import assert from 'node:assert/strict';
import test from 'node:test';

import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../../src/common/auth/roles.decorator';
import { AdminController } from '../../src/modules/identity/admin.controller';
import { AdminRegionsController } from '../../src/modules/regions/regions.controller';

test('admin user routes require super_admin or support_agent', () => {
  const roles = new Reflector().get(ROLES_KEY, AdminController);
  assert.ok(roles?.includes('super_admin'));
});

test('admin region routes require super_admin', () => {
  const roles = new Reflector().get(ROLES_KEY, AdminRegionsController);
  assert.deepEqual(roles, ['super_admin']);
});
