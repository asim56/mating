import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { STORAGE_BUCKETS, type StorageProvider } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../common';
import { STORAGE_PROVIDER } from '../../infra/storage/supabase-storage.provider';
import { ANIMALS_REPOSITORY, type InMemoryAnimalsRepository } from '../animals/animals.repository';
import { animalPolicy } from '../animals/policies/animal.policy';
import {
  ANIMAL_HEALTH_REPOSITORY,
  type InMemoryAnimalHealthRepository,
} from './animal-health.repository';
import type { CreateHealthRecordDto } from './dto/create-health-record.dto';
import type { HealthRecord } from './entities/health-record.entity';

@Injectable()
export class AnimalHealthService {
  constructor(
    @Inject(ANIMAL_HEALTH_REPOSITORY) private readonly health: InMemoryAnimalHealthRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  async create(
    animalId: string,
    dto: CreateHealthRecordDto,
    user: AuthenticatedUser,
  ): Promise<HealthRecord> {
    const animal = await this.requireAnimalAccess(animalId, user, { allowVet: true });
    const isVet = animalPolicy.canManageAsVet(user);
    const isOwner = animal.ownerId === user.id;

    if (!isOwner && !isVet) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }

    return this.health.create({
      animalId,
      recordType: dto.recordType,
      title: dto.title,
      recordDate: dto.recordDate,
      expiresAt: dto.expiresAt,
      storagePath: dto.storagePath,
      createdBy: user.id,
      veterinarianId: isVet ? user.id : null,
    });
  }

  async list(animalId: string, user: AuthenticatedUser): Promise<HealthRecord[]> {
    await this.requireAnimalAccess(animalId, user, { allowVet: true });
    return this.health.listByAnimal(animalId);
  }

  async createReadUrl(animalId: string, recordId: string, user: AuthenticatedUser) {
    await this.requireAnimalAccess(animalId, user, { allowVet: true });
    const records = await this.health.listByAnimal(animalId);
    const record = records.find((r) => r.id === recordId);
    if (!record?.storagePath) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Record not found.', HttpStatus.NOT_FOUND);
    }
    const signed = await this.storage.createSignedReadUrl({
      bucket: STORAGE_BUCKETS[1],
      path: record.storagePath,
    });
    return { url: signed.url, expiresAt: signed.expiresAt };
  }

  private async requireAnimalAccess(
    animalId: string,
    user: AuthenticatedUser,
    options: { allowVet: boolean },
  ) {
    const animal = await this.animals.findById(animalId);
    if (!animal || animal.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    const isOwner = animal.ownerId === user.id;
    const isVet = options.allowVet && animalPolicy.canManageAsVet(user);
    if (!isOwner && !isVet) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }
    return animal;
  }
}
