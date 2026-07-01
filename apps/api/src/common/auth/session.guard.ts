import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from './roles.decorator';
import { IS_PUBLIC_KEY } from './roles.decorator';
import { Reflector } from '@nestjs/core';

import { SessionsRepository } from '../../modules/identity/sessions.repository';
import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';

/**
 * Rejects requests whose mirrored session is revoked. Runs after {@link JwtAuthGuard}.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionsRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      return true;
    }

    const sessionId = user.sessionId as string | undefined;
    if (!sessionId) {
      return true;
    }

    const active = await this.sessions.isActive(sessionId);
    if (!active) {
      throw new ApiError(
        ERROR_CODES.UNAUTHENTICATED,
        'Invalid or expired token.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }
}
