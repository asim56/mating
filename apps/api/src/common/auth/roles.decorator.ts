import { SetMetadata } from '@nestjs/common';

import type { UserRole } from '@mating/shared';

export const ROLES_KEY = 'required_roles';
export const IS_PUBLIC_KEY = 'is_public';

/** Restricts a route/controller to the given roles (any-of). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

/** Marks a route/controller as public, bypassing JWT authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Authenticated principal attached to the request by {@link JwtAuthGuard}. */
export type AuthenticatedUser = {
  id: string;
  roles: UserRole[];
  email?: string;
  [claim: string]: unknown;
};
