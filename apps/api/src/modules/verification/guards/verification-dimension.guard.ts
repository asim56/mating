import { HttpStatus } from '@nestjs/common';

import { canApproveVerificationDimension } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../../common';

/** Asserts caller may approve/reject the given verification dimension (FR-001). */
export function assertVerificationDimensionAccess(
  user: AuthenticatedUser,
  dimension: string,
): void {
  if (canApproveVerificationDimension(user.roles, dimension)) {
    return;
  }
  throw new ApiError(
    ERROR_CODES.FORBIDDEN,
    `Role not authorized for dimension: ${dimension}.`,
    HttpStatus.FORBIDDEN,
    { dimension },
  );
}

/** Support agents may read the queue but not decide. */
export function assertVerificationDecisionRole(user: AuthenticatedUser): void {
  const isSupportOnly =
    user.roles.includes('support_agent') &&
    !user.roles.some((r) =>
      ['super_admin', 'veterinarian', 'inspector'].includes(r),
    );
  if (isSupportOnly) {
    throw new ApiError(
      ERROR_CODES.FORBIDDEN,
      'Support agents may not approve or reject verifications.',
      HttpStatus.FORBIDDEN,
    );
  }
}
