import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import type { UserRole } from '@mating/shared';

import type { TokenVerifier, VerifiedToken } from './jwt.guard';

export class JwksTokenVerifier implements TokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(supabaseUrl: string, issuer: string, audience: string) {
    const base = supabaseUrl.replace(/\/$/, '');
    this.jwks = createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`));
    this.issuer = issuer;
    this.audience = audience;
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
      audience: this.audience,
    });
    return this.mapPayload(payload);
  }

  private mapPayload(payload: JWTPayload): VerifiedToken {
    if (!payload.sub) {
      throw new Error('JWT missing subject');
    }
    const roles = Array.isArray((payload as VerifiedToken).roles)
      ? ((payload as VerifiedToken).roles as UserRole[])
      : [];
    return {
      sub: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      roles,
      exp: payload.exp,
      session_id:
        typeof (payload as Record<string, unknown>).session_id === 'string'
          ? ((payload as Record<string, unknown>).session_id as string)
          : undefined,
    };
  }
}
