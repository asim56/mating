import assert from 'node:assert/strict';
import test from 'node:test';

import { SELF_SELECTABLE_ROLES } from '@mating/shared';

test('admin-only roles are not self-selectable', () => {
  const adminRoles = ['super_admin', 'support_agent', 'veterinarian', 'inspector'];
  for (const role of adminRoles) {
    assert.ok(!SELF_SELECTABLE_ROLES.includes(role as never));
  }
});
