import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERIFICATION_DIMENSIONS,
  VERIFICATION_RBAC_MATRIX,
  canApproveVerificationDimension,
} from '@mating/shared';

import type { AuthenticatedUser } from '../../src/common';
import { ApiError } from '../../src/common';
import { assertVerificationDimensionAccess } from '../../src/modules/verification/guards/verification-dimension.guard';

const roles = Object.keys(VERIFICATION_RBAC_MATRIX);

test('verification RBAC matrix allows only scoped dimensions (SC-001)', () => {
  for (const dimension of VERIFICATION_DIMENSIONS) {
    for (const role of roles) {
      const user: AuthenticatedUser = { id: `user-${role}`, roles: [role as never] };
      const allowed = canApproveVerificationDimension(user.roles, dimension);
      const expected = VERIFICATION_RBAC_MATRIX[role]!.includes(dimension);
      assert.equal(allowed, expected, `${role} × ${dimension}`);
    }
  }
});

test('inspector health approval returns FORBIDDEN', () => {
  const inspector: AuthenticatedUser = { id: 'inspector-1', roles: ['inspector'] };
  assert.throws(
    () => assertVerificationDimensionAccess(inspector, 'health'),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});

test('vet health approval allowed', () => {
  const vet: AuthenticatedUser = { id: 'vet-1', roles: ['veterinarian'] };
  assert.doesNotThrow(() => assertVerificationDimensionAccess(vet, 'health'));
});
