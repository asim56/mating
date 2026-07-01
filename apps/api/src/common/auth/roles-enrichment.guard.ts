import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { UserRole } from '@mating/shared';

import type { AuthenticatedUser } from '../auth/roles.decorator';
import { UserRolesRepository } from '../../modules/identity/sessions.repository';

/**
 * Loads roles from `user_roles` when the JWT does not carry custom claims.
 * Runs after {@link JwtAuthGuard} and before {@link RolesGuard}.
 */
@Injectable()
export class RolesEnrichmentGuard implements CanActivate {
  constructor(private readonly roles: UserRolesRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || (user.roles && user.roles.length > 0)) {
      return true;
    }

    const roles = await this.roles.listRoles(user.id);
    user.roles = roles as UserRole[];
    return true;
  }
}
