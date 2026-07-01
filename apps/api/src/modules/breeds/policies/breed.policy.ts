import type { UserRole } from '@mating/shared';

import type { AuthenticatedUser } from '../../../common';

/**
 * Breed taxonomy is platform reference data: only administrators may add or edit
 * breeds. Reads are public (active breeds) and need no role.
 */
export const BREED_ADMIN_ROLES: readonly UserRole[] = ['super_admin'];

/** Centralized authorization check, mirrored by the route-level `@Roles`. */
export function canManageBreeds(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return user.roles.some((role) => BREED_ADMIN_ROLES.includes(role));
}
