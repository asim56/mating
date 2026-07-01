import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES } from '../../common';
import type { CreateBreedDto } from './dto/create-breed.dto';
import type { UpdateBreedDto } from './dto/update-breed.dto';
import { type Breed, type BreedPublicView, toPublicView } from './entities/breed.entity';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  type AuditEmitter,
  breedCreatedEvent,
  breedUpdatedEvent,
} from './events/breed-changed.event';
import { BREED_REPOSITORY, type BreedFilter, type BreedRepository } from './breeds.repository';

@Injectable()
export class BreedsService {
  constructor(
    @Inject(BREED_REPOSITORY) private readonly breeds: BreedRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: AuditEmitter,
  ) {}

  /** Active breeds only (public reference data), optionally filtered. */
  async listPublic(filter?: BreedFilter): Promise<BreedPublicView[]> {
    const active = await this.breeds.findActive(filter);
    return active.map(toPublicView);
  }

  /** All breeds (admin), including inactive. */
  async listAll(): Promise<Breed[]> {
    return this.breeds.findAll();
  }

  /** Single breed by id (admin); 404 when unknown. */
  async getById(id: string): Promise<Breed> {
    const breed = await this.breeds.findById(id);
    if (!breed) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, `Breed '${id}' not found.`, HttpStatus.NOT_FOUND);
    }
    return breed;
  }

  /**
   * Creates a breed and emits a `breed.created` audit event. Enforces the
   * (species, name, region) uniqueness constraint with a 409 before insert.
   */
  async create(dto: CreateBreedDto, actorId: string): Promise<Breed> {
    const existing = await this.breeds.findByNaturalKey(dto.regionCode, dto.species, dto.name);
    if (existing) {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        `Breed '${dto.name}' already exists for ${dto.species} in ${dto.regionCode}.`,
        HttpStatus.CONFLICT,
      );
    }

    const created = await this.breeds.create({
      regionCode: dto.regionCode,
      species: dto.species,
      name: dto.name,
      description: dto.description ?? null,
      active: dto.active ?? true,
    });

    await this.audit.emit(
      breedCreatedEvent(actorId, created.id, {
        regionCode: created.regionCode,
        species: created.species,
        name: created.name,
      }),
    );
    return created;
  }

  /**
   * Applies an admin patch and emits a `breed.updated` audit event. 404 when the
   * breed is unknown; renaming into an existing (species, region) name is a 409.
   */
  async update(id: string, dto: UpdateBreedDto, actorId: string): Promise<Breed> {
    const current = await this.breeds.findById(id);
    if (!current) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, `Breed '${id}' not found.`, HttpStatus.NOT_FOUND);
    }

    if (dto.name !== undefined && dto.name !== current.name) {
      const clash = await this.breeds.findByNaturalKey(
        current.regionCode,
        current.species,
        dto.name,
      );
      if (clash && clash.id !== id) {
        throw new ApiError(
          ERROR_CODES.CONFLICT,
          `Breed '${dto.name}' already exists for ${current.species} in ${current.regionCode}.`,
          HttpStatus.CONFLICT,
        );
      }
    }

    const updated = await this.breeds.update(id, dto);
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, `Breed '${id}' not found.`, HttpStatus.NOT_FOUND);
    }

    await this.audit.emit(breedUpdatedEvent(actorId, id, Object.keys(dto)));
    return updated;
  }
}
