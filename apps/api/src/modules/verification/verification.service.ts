import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import type { VerificationDimensionMap } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { ANIMALS_REPOSITORY, type InMemoryAnimalsRepository } from '../animals/animals.repository';
import { animalPolicy } from '../animals/policies/animal.policy';

@Injectable()
export class VerificationService {
  constructor(
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
  ) {}

  async getDimensions(
    animalId: string,
    user: AuthenticatedUser,
  ): Promise<{ dimensions: VerificationDimensionMap }> {
    const animal = await this.animals.findById(animalId);
    if (!animal || animal.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    animalPolicy.assertCanAccess(user, animal);
    return { dimensions: animal.verificationDimensions };
  }
}
