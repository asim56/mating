import type { UserRole } from '../types';
import type { VerificationDimension } from '../types/animal';

/** Role → allowed verification dimensions for approve/reject (FR-001). */
export const VERIFICATION_RBAC_MATRIX: Readonly<
  Record<string, readonly VerificationDimension[]>
> = {
  veterinarian: ['health', 'vaccination'],
  inspector: ['media', 'facility', 'pedigree'],
  super_admin: [
    'owner_identity',
    'media',
    'health',
    'vaccination',
    'pedigree',
    'facility',
  ],
} as const;

export function canApproveVerificationDimension(
  roles: UserRole[],
  dimension: string,
): boolean {
  for (const role of roles) {
    const allowed = VERIFICATION_RBAC_MATRIX[role];
    if (allowed?.includes(dimension as VerificationDimension)) {
      return true;
    }
  }
  return false;
}
