import { HttpStatus } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/roles.decorator';
import { ApiError } from '../errors/api-error';
import { ERROR_CODES } from '../errors/error-codes';

const FIELD_REP_FORBIDDEN_SCOPES = [
  'payments',
  'payouts',
  'disputes',
  'moderation',
] as const;

export type FieldRepForbiddenScope = (typeof FIELD_REP_FORBIDDEN_SCOPES)[number];

/** Field Onboarding Rep scoped actions — 403 on payment/dispute/moderation routes (FR-010). */
export function assertFieldRepForbidden(
  user: AuthenticatedUser,
  scope: FieldRepForbiddenScope,
): void {
  if (!user.roles.includes('field_onboarding_rep')) {
    return;
  }
  if (FIELD_REP_FORBIDDEN_SCOPES.includes(scope)) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      `Field onboarding rep cannot access ${scope}.`,
      HttpStatus.FORBIDDEN,
      { scope },
    );
  }
}

export function isFieldOnboardingRep(user: AuthenticatedUser): boolean {
  return user.roles.includes('field_onboarding_rep');
}
