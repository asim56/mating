import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRole } from '@mating/shared';

import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';
import { type AuthenticatedUser, ROLES_KEY } from './roles.decorator';

/**
 * Authorizes a request against the `@Roles(...)` metadata. Must run after
 * {@link JwtAuthGuard}, which populates `request.user`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ApiError(
        ERROR_CODES.UNAUTHENTICATED,
        'Authentication required.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const hasRole = user.roles.some((role) => required.includes(role));
    if (!hasRole) {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        'Insufficient role for this action.',
        HttpStatus.FORBIDDEN,
        { requiredRoles: required },
      );
    }

    return true;
  }
}
