import type { UserRole } from '@mating/shared';

import type { AuthenticatedUser } from '../../../common';

/**
 * Region configuration is compliance-sensitive: only platform administrators may
 * read or change it. Support/Field-Rep variants are intentionally excluded
 * (they cannot alter currency, locale, eligibility, or compliance flags).
 */
export const REGION_ADMIN_ROLES: readonly UserRole[] = ['super_admin'];

/** Centralized authorization check, mirrored by the route-level `@Roles`. */
export function canManageRegions(user: Pick<AuthenticatedUser, 'roles'>): boolean {
  return user.roles.some((role) => REGION_ADMIN_ROLES.includes(role));
}
