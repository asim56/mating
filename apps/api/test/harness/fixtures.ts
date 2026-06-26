import type { UserRole } from '@mating/shared';

import type { AuthenticatedUser } from '../../src/common/auth/roles.decorator';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

/**
 * Builds a structurally-valid (unsigned) JWT for tests. The M0
 * {@link StructuralTokenVerifier} validates shape + expiry only, so this is
 * sufficient until JWKS verification lands in M1.
 */
export function signTestToken(payload: {
  sub: string;
  roles?: UserRole[];
  email?: string;
  exp?: number;
}): string {
  const header = base64url({ alg: 'none', typ: 'JWT' });
  const body = base64url({
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...payload,
  });
  return `${header}.${body}.testsignature`;
}

export const TEST_USERS = {
  superAdmin: { id: 'user-super-admin', roles: ['super_admin'] as UserRole[] },
  support: { id: 'user-support', roles: ['support_agent'] as UserRole[] },
  breeder: { id: 'user-breeder', roles: ['breeder'] as UserRole[] },
  owner: { id: 'user-owner', roles: ['animal_owner'] as UserRole[] },
  vet: { id: 'user-vet', roles: ['veterinarian'] as UserRole[] },
} as const;

export function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return { id: 'user-test', roles: [], ...overrides };
}
