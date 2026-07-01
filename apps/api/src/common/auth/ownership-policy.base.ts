import { HttpStatus } from '@nestjs/common';

import { USER_ROLES, type UserRole } from '@mating/shared';

import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';
import type { AuthenticatedUser } from './roles.decorator';

/** Roles that bypass per-resource ownership checks. */
const ADMIN_ROLES: readonly UserRole[] = [
  USER_ROLES[0], // super_admin
  USER_ROLES[1], // support_agent
];

/**
 * Base class for per-resource ownership authorization. Domain modules extend
 * this and implement {@link getOwnerId}; the dual-layer model still enforces
 * the same ownership at the database via RLS.
 */
export abstract class OwnershipPolicy<TResource> {
  /** Returns the id of the principal that owns the resource. */
  protected abstract getOwnerId(resource: TResource): string;

  /** Admin/support roles may act on resources they do not own. */
  protected adminRoles(): readonly UserRole[] {
    return ADMIN_ROLES;
  }

  isOwner(user: AuthenticatedUser, resource: TResource): boolean {
    return this.getOwnerId(resource) === user.id;
  }

  canAccess(user: AuthenticatedUser, resource: TResource): boolean {
    if (this.isOwner(user, resource)) {
      return true;
    }
    return user.roles.some((role) => this.adminRoles().includes(role));
  }

  /** Throws {@link ApiError} (403) unless the user owns the resource or is admin. */
  assertCanAccess(user: AuthenticatedUser, resource: TResource): void {
    if (!this.canAccess(user, resource)) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        'You do not have access to this resource.',
        HttpStatus.FORBIDDEN,
      );
    }
  }
}
