import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { UserRole } from '@mating/shared';

import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';
import { type AuthenticatedUser, IS_PUBLIC_KEY } from './roles.decorator';

export type VerifiedToken = {
  sub: string;
  email?: string;
  roles?: UserRole[];
  exp?: number;
  [claim: string]: unknown;
};

export interface TokenVerifier {
  verify(token: string): VerifiedToken;
}

/**
 * Structural JWT decoder used for the M0 scaffold: validates shape and
 * expiry only. Cryptographic signature verification against Supabase JWKS is
 * wired in M1 by swapping this verifier — the guard contract stays the same.
 */
export class StructuralTokenVerifier implements TokenVerifier {
  constructor(private readonly now: () => number = () => Date.now()) {}

  verify(token: string): VerifiedToken {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new Error('Malformed JWT');
    }

    let payload: VerifiedToken;
    try {
      payload = JSON.parse(Buffer.from(segments[1] ?? '', 'base64url').toString('utf8'));
    } catch {
      throw new Error('Unparseable JWT payload');
    }

    if (!payload || typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('JWT missing subject');
    }

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= this.now()) {
      throw new Error('JWT expired');
    }

    return payload;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: TokenVerifier = new StructuralTokenVerifier(),
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      user?: AuthenticatedUser;
    }>();

    const token = this.extractBearerToken(request.headers?.authorization);
    if (!token) {
      throw new ApiError(
        ERROR_CODES.UNAUTHENTICATED,
        'Missing or malformed Authorization header.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let verified: VerifiedToken;
    try {
      verified = this.verifier.verify(token);
    } catch {
      throw new ApiError(
        ERROR_CODES.UNAUTHENTICATED,
        'Invalid or expired token.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    request.user = {
      id: verified.sub,
      roles: Array.isArray(verified.roles) ? verified.roles : [],
      ...(verified.email ? { email: verified.email } : {}),
    };

    return true;
  }

  private extractBearerToken(header: string | string[] | undefined): string | null {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      return null;
    }
    const [scheme, token] = value.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return null;
    }
    return token;
  }
}
