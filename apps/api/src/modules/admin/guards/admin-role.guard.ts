import { HttpStatus, Injectable } from '@nestjs/common';

import type { UserRole } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../../common';
import { assertFieldRepForbidden } from '../../../common';

const SUPPORT_SCOPED_ROLES: UserRole[] = [
  'super_admin',
  'support_agent',
  'veterinarian',
  'inspector',
];

/** Admin role guard extensions for M6 trust/admin scopes. */
@Injectable()
export class AdminRoleGuardService {
  assertSupportOrAdmin(user: AuthenticatedUser): void {
    if (!user.roles.some((r) => SUPPORT_SCOPED_ROLES.includes(r))) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Admin access required.', HttpStatus.FORBIDDEN);
    }
  }

  assertSuperAdmin(user: AuthenticatedUser): void {
    if (!user.roles.includes('super_admin')) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Super admin required.', HttpStatus.FORBIDDEN);
    }
  }

  assertDisputeAccess(user: AuthenticatedUser): void {
    assertFieldRepForbidden(user, 'disputes');
    if (
      !user.roles.some((r) => r === 'super_admin' || r === 'support_agent')
    ) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Support access required.', HttpStatus.FORBIDDEN);
    }
  }

  assertModerationAccess(user: AuthenticatedUser): void {
    assertFieldRepForbidden(user, 'moderation');
    if (
      !user.roles.some((r) => r === 'super_admin' || r === 'support_agent')
    ) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Support access required.', HttpStatus.FORBIDDEN);
    }
  }
}
