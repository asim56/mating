import { HttpStatus } from '@nestjs/common';

import type { UserRole } from '@mating/shared';

import { ApiError, ERROR_CODES, OwnershipPolicy } from '../../../common';
import type { AuthenticatedUser } from '../../../common';
import type { Animal } from '../entities/animal.entity';

const VET_ROLES: readonly UserRole[] = ['veterinarian'];

export class AnimalPolicy extends OwnershipPolicy<Animal> {
  protected getOwnerId(resource: Animal): string {
    return resource.ownerId;
  }

  canManageAsVet(user: AuthenticatedUser): boolean {
    return user.roles.some((role) => VET_ROLES.includes(role));
  }
}

export const animalPolicy = new AnimalPolicy();

/** Suspended owners cannot create animals or mark publish-ready (service-level guard). */
export function assertOwnerCanMutateAnimals(accountStatus: string | undefined): void {
  if (accountStatus === 'suspended') {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Account is suspended.', HttpStatus.FORBIDDEN);
  }
}
