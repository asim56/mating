import test from 'node:test';

import type { UserRole } from '@mating/shared';

import { RolesGuard } from '../../src/common/auth/roles.guard';
import { ROLES_KEY } from '../../src/common/auth/roles.decorator';
import { assertRoleMatrix, metadataReflector } from './rbac';
import { assertTransitions, type TransitionMap } from './state-transitions';

test('harness: RBAC role-matrix sample (admin-only action)', () => {
  assertRoleMatrix({
    guardFor: (required) => new RolesGuard(metadataReflector({ [ROLES_KEY]: required })),
    required: ['super_admin', 'support_agent'],
    allowed: [['super_admin'], ['support_agent']] as UserRole[][],
    denied: [['breeder'], ['animal_owner'], []] as UserRole[][],
  });
});

test('harness: state-transition sample map', () => {
  const map: TransitionMap<'draft' | 'active' | 'closed'> = {
    draft: ['active'],
    active: ['closed'],
    closed: [],
  };

  assertTransitions({
    map,
    allowed: [
      ['draft', 'active'],
      ['active', 'closed'],
    ],
    forbidden: [
      ['draft', 'closed'],
      ['closed', 'active'],
    ],
  });
});
