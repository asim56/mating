import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import {
  STORAGE_BUCKETS,
  VERIFICATION_DIMENSIONS,
  evaluatePublishReadyEligibility,
  type RegionCode,
  type StorageProvider,
  type VerificationDimensionMap,
} from '@mating/shared';

import {
  ApiError,
  ERROR_CODES,
  type AuthenticatedUser,
  buildPage,
  clampLimit,
} from '../../common';
import { STORAGE_PROVIDER, ownerScopedPath } from '../../infra/storage/supabase-storage.provider';
import { SupabaseService } from '../../infra/supabase/supabase.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  ANIMAL_MEDIA_REPOSITORY,
  type InMemoryAnimalMediaRepository,
} from './animal-media.repository';
import {
  ANIMALS_REPOSITORY,
  InMemoryAnimalsRepository,
  type InMemoryAnimalsRepository as AnimalsRepo,
} from './animals.repository';
import type { CreateAnimalDto } from './dto/create-animal.dto';
import type { UpdateAnimalDto } from './dto/update-animal.dto';
import type { Animal } from './entities/animal.entity';
import type { AuditEmitter } from './events/animal.events';
import {
  animalPublishReadyEvent,
  animalSoftDeletedEvent,
  animalUpdatedEvent,
} from './events/animal.events';
import { animalPolicy, assertOwnerCanMutateAnimals } from './policies/animal.policy';

function initialVerificationDimensions(): VerificationDimensionMap {
  return Object.fromEntries(
    VERIFICATION_DIMENSIONS.map((d) => [d, 'unverified' as const]),
  ) as VerificationDimensionMap;
}

@Injectable()
export class AnimalsService {
  constructor(
    @Inject(ANIMALS_REPOSITORY) private readonly animals: AnimalsRepo,
    @Inject(ANIMAL_MEDIA_REPOSITORY) private readonly media: InMemoryAnimalMediaRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: AuditEmitter,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly supabase: SupabaseService,
  ) {}

  async create(dto: CreateAnimalDto, user: AuthenticatedUser): Promise<Animal> {
    await this.assertAccountActive(user.id);
    assertOwnerCanMutateAnimals(await this.getAccountStatus(user.id));

    const regionCode = dto.regionCode ?? (await this.resolveRegionCode(user.id));
    const regionId = await this.resolveRegionId(regionCode);

    return this.animals.create({
      ownerId: user.id,
      regionCode,
      regionId,
      species: dto.species,
      breedId: dto.breedId,
      name: dto.name,
      sex: dto.sex,
      dateOfBirth: dto.dateOfBirth,
      approximateAgeMonths: dto.approximateAgeMonths,
      weightKg: dto.weightKg,
      color: dto.color,
      description: dto.description,
      city: dto.city,
      provinceOrState: dto.provinceOrState,
      countryCode: dto.countryCode,
      verificationDimensions: initialVerificationDimensions(),
    });
  }

  async list(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: Animal['breedingStatus'] },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.animals.listByOwner({
      ownerId: user.id,
      breedingStatus: query.status,
      cursor: query.cursor,
      limit,
    });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async getById(id: string, user: AuthenticatedUser): Promise<Animal & { mediaCount: number }> {
    const animal = await this.requireOwnedAnimal(id, user);
    const mediaCount = await this.media.countImages(id);
    return { ...animal, mediaCount };
  }

  async update(id: string, dto: UpdateAnimalDto, user: AuthenticatedUser): Promise<Animal> {
    const current = await this.requireOwnedAnimal(id, user);
    if (current.breedingStatus !== 'draft' && current.breedingStatus !== 'not_listed') {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Only draft animals can be edited.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.animals.update(id, dto);
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }

    await this.audit.emit(
      animalUpdatedEvent(user.id, id, Object.keys(dto)),
    );
    return updated;
  }

  async softDelete(id: string, user: AuthenticatedUser): Promise<void> {
    await this.requireOwnedAnimal(id, user);
    const deleted = await this.animals.softDelete(id);
    if (!deleted) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    await this.audit.emit(animalSoftDeletedEvent(user.id, id));
  }

  async publishReady(id: string, user: AuthenticatedUser): Promise<Animal> {
    await this.assertAccountActive(user.id);
    assertOwnerCanMutateAnimals(await this.getAccountStatus(user.id));

    const animal = await this.requireOwnedAnimal(id, user);
    const imageCount = await this.media.countImages(id);
    const result = evaluatePublishReadyEligibility({
      regionCode: animal.regionCode,
      species: animal.species,
      dateOfBirth: animal.dateOfBirth,
      approximateAgeMonths: animal.approximateAgeMonths,
      ownerDeclaration: animal.ownerDeclaration,
      imageCount,
      healthStatus: animal.healthStatus,
      sex: animal.sex,
      countryCode: animal.countryCode,
    });

    if (!result.eligible) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        result.messages.join(' '),
        HttpStatus.BAD_REQUEST,
        { missing: result.missing },
      );
    }

    const updated = await this.animals.setBreedingStatus(id, 'publish_ready');
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    await this.audit.emit(animalPublishReadyEvent(user.id, id));
    return updated;
  }

  async createMediaUploadUrl(
    id: string,
    user: AuthenticatedUser,
    input: { contentType: string; mediaType: 'image' | 'document'; filename: string },
  ) {
    const animal = await this.requireOwnedAnimal(id, user);
    const path = ownerScopedPath(animal.ownerId, id, input.filename);
    const signed = await this.storage.createSignedUploadUrl({
      bucket: STORAGE_BUCKETS[0],
      path,
      contentType: input.contentType,
    });

    await this.media.create({
      animalId: id,
      storagePath: path,
      mediaType: input.mediaType,
      sortOrder: await this.media.countImages(id),
    });

    return { url: signed.url, path, expiresAt: signed.expiresAt };
  }

  async listMedia(id: string, user: AuthenticatedUser) {
    const animal = await this.requireOwnedAnimal(id, user);
    const items = await this.media.listByAnimal(id);
    const data = await Promise.all(
      items.map(async (item) => {
        const read = await this.storage.createSignedReadUrl({
          bucket: STORAGE_BUCKETS[0],
          path: item.storagePath,
        });
        return {
          id: item.id,
          mediaType: item.mediaType,
          sortOrder: item.sortOrder,
          readUrl: read.url,
        };
      }),
    );
    return { data };
  }

  private async requireOwnedAnimal(id: string, user: AuthenticatedUser): Promise<Animal> {
    const animal = await this.animals.findById(id);
    if (!animal || animal.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    animalPolicy.assertCanAccess(user, animal);
    return animal;
  }

  private async resolveRegionCode(accountId: string): Promise<RegionCode> {
    const { data } = await this.supabase.client
      .from('profiles')
      .select('region_id, regions(code)')
      .eq('account_id', accountId)
      .maybeSingle();

    const code = (data?.regions as { code?: string } | null)?.code;
    if (code === 'PK' || code === 'US') {
      return code;
    }
    return 'PK';
  }

  private async resolveRegionId(regionCode: RegionCode): Promise<string> {
    const { data } = await this.supabase.client
      .from('regions')
      .select('id')
      .eq('code', regionCode)
      .maybeSingle();
    return data?.id ?? regionCode;
  }

  private async getAccountStatus(accountId: string): Promise<string | undefined> {
    const { data } = await this.supabase.client
      .from('account_status')
      .select('status')
      .eq('account_id', accountId)
      .maybeSingle();
    return data?.status;
  }

  private async assertAccountActive(accountId: string): Promise<void> {
    const status = await this.getAccountStatus(accountId);
    assertOwnerCanMutateAnimals(status);
  }
}
