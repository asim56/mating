import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { ANIMALS_REPOSITORY, type InMemoryAnimalsRepository } from '../animals/animals.repository';
import { animalPolicy } from '../animals/policies/animal.policy';
import type { CreatePedigreeDto } from './dto/create-pedigree.dto';
import type { PedigreeRecord } from './entities/pedigree-record.entity';
import { PEDIGREE_REPOSITORY, type InMemoryPedigreeRepository } from './pedigree.repository';

@Injectable()
export class PedigreeService {
  constructor(
    @Inject(PEDIGREE_REPOSITORY) private readonly pedigree: InMemoryPedigreeRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
  ) {}

  async create(
    animalId: string,
    dto: CreatePedigreeDto,
    user: AuthenticatedUser,
  ): Promise<PedigreeRecord> {
    const animal = await this.requireOwner(animalId, user);
    this.assertNoCircularReference(animalId, dto.sireAnimalId, dto.damAnimalId);

    return this.pedigree.create({
      animalId,
      sireAnimalId: dto.sireAnimalId,
      damAnimalId: dto.damAnimalId,
      registryName: dto.registryName,
      registryNumber: dto.registryNumber,
      documentPath: dto.documentPath,
    });
  }

  async list(animalId: string, user: AuthenticatedUser): Promise<{ data: PedigreeRecord[] }> {
    await this.requireOwner(animalId, user);
    const data = await this.pedigree.listByAnimal(animalId);
    return { data };
  }

  private async requireOwner(animalId: string, user: AuthenticatedUser) {
    const animal = await this.animals.findById(animalId);
    if (!animal || animal.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    animalPolicy.assertCanAccess(user, animal);
    if (animal.ownerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Only the owner may manage pedigree.', HttpStatus.FORBIDDEN);
    }
    return animal;
  }

  private assertNoCircularReference(
    animalId: string,
    sireId?: string,
    damId?: string,
  ): void {
    if (sireId === animalId || damId === animalId) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'An animal cannot be its own sire or dam.',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (sireId && damId && sireId === damId) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Sire and dam must be different animals.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
