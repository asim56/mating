import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { REGIONS, type RegionCode } from '@mating/shared';

import {
  ApiError,
  ERROR_CODES,
  type AuthenticatedUser,
  buildPage,
  clampLimit,
} from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import { AUDIT_EMITTER } from '../audit/audit.service';
import type { AuditEvent } from './events/listing.events';
import {
  ANIMAL_MEDIA_REPOSITORY,
  type InMemoryAnimalMediaRepository,
} from '../animals/animal-media.repository';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import { animalPolicy } from '../animals/policies/animal.policy';
import type { CreateListingDto } from './dto/create-listing.dto';
import { toPublicSummary } from './dto/listing-response.dto';
import type { PublicListingDetailDto } from './dto/public-listing-detail.dto';
import type { UpdateListingDto } from './dto/create-listing.dto';
import type { Listing } from './entities/listing.entity';
import {
  listingCreatedEvent,
  listingPausedEvent,
  listingPublishedEvent,
  listingUnpublishedEvent,
  listingUpdatedEvent,
} from './events/listing.events';
import {
  InMemoryMarketplaceRepository,
  InMemorySavedListingsRepository,
  MARKETPLACE_REPOSITORY,
  SAVED_LISTINGS_REPOSITORY,
} from './marketplace.repository';
import { assertCanPublish } from './policies/listing.policy';

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(ANIMAL_MEDIA_REPOSITORY) private readonly media: InMemoryAnimalMediaRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: AuditEvent): Promise<void> },
    private readonly analytics: AnalyticsService,
  ) {}

  async create(dto: CreateListingDto, user: AuthenticatedUser): Promise<Listing> {
    const animal = await this.requireOwnedPublishReadyAnimal(dto.animalId, user);
    const existing = await this.listings.findActiveByAnimal(dto.animalId);
    if (existing) {
      throw new ApiError(
        ERROR_CODES.CONFLICT,
        'Animal already has an active listing.',
        HttpStatus.CONFLICT,
      );
    }

    const currencyCode =
      dto.currencyCode ?? REGIONS[animal.regionCode as RegionCode]?.currency ?? 'PKR';

    const created = await this.listings.create({
      animalId: animal.id,
      ownerId: user.id,
      regionId: animal.regionId,
      regionCode: animal.regionCode,
      listingType: dto.listingType,
      title: dto.title,
      description: dto.description,
      breedingMethod: dto.breedingMethod,
      priceAmount: dto.priceAmount,
      currencyCode,
      locationRadiusKm: dto.locationRadiusKm,
      species: animal.species,
      breedId: animal.breedId,
      breedName: null,
      sex: animal.sex,
      city: animal.city,
      provinceOrState: animal.provinceOrState,
      latitude: animal.latitude,
      longitude: animal.longitude,
      healthStatus: animal.healthStatus,
      verificationDimensions: animal.verificationDimensions,
      ownerDisplayName: null,
    });

    await this.audit.emit(listingCreatedEvent(user.id, created.id));
    return created;
  }

  async update(id: string, dto: UpdateListingDto, user: AuthenticatedUser): Promise<Listing> {
    const listing = await this.requireOwnedListing(id, user);
    if (listing.status === 'active') {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Pause or unpublish before editing an active listing.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const updated = await this.listings.update(id, dto);
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    await this.audit.emit(listingUpdatedEvent(user.id, id, Object.keys(dto)));
    return updated;
  }

  async listMine(
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number; status?: Listing['status'] },
  ) {
    const limit = clampLimit(query.limit);
    const rows = await this.listings.listByOwner({
      ownerId: user.id,
      status: query.status,
      cursor: query.cursor,
      limit,
    });
    return buildPage(rows, limit, (row) => row.createdAt);
  }

  async publish(id: string, user: AuthenticatedUser): Promise<Listing> {
    const listing = await this.requireOwnedListing(id, user);
    const animal = await this.animals.findById(listing.animalId);
    if (!animal) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    const imageCount = await this.media.countImages(animal.id);
    assertCanPublish(listing, animal, imageCount);

    const updated = await this.listings.setStatus(id, 'active');
    if (!updated) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    await this.animals.setBreedingStatus(animal.id, 'listed');
    await this.audit.emit(listingPublishedEvent(user.id, id));
    await this.analytics.capture({
      event: 'animal_published',
      accountId: user.id,
      properties: { animalId: animal.id, listingId: id, listingType: listing.listingType },
    });
    return updated;
  }

  async pause(id: string, user: AuthenticatedUser): Promise<Listing> {
    const listing = await this.requireOwnedListing(id, user);
    if (listing.status !== 'active') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Only active listings can be paused.', HttpStatus.BAD_REQUEST);
    }
    const updated = await this.listings.setStatus(id, 'paused');
    if (!updated) throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    await this.audit.emit(listingPausedEvent(user.id, id));
    return updated;
  }

  async unpublish(id: string, user: AuthenticatedUser): Promise<Listing> {
    const listing = await this.requireOwnedListing(id, user);
    if (listing.status !== 'active' && listing.status !== 'paused') {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Listing is not published.', HttpStatus.BAD_REQUEST);
    }
    const updated = await this.listings.setStatus(id, 'draft');
    if (!updated) throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    await this.animals.setBreedingStatus(listing.animalId, 'publish_ready');
    await this.audit.emit(listingUnpublishedEvent(user.id, id));
    return updated;
  }

  async getPublicDetail(id: string, viewerId?: string): Promise<PublicListingDetailDto> {
    const listing = await this.listings.findById(id);
    if (!listing || listing.status !== 'active' || listing.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not available.', HttpStatus.NOT_FOUND);
    }
    await this.analytics.capture({
      event: 'listing_viewed',
      accountId: viewerId ?? null,
      properties: {
        listingId: id,
        regionId: listing.regionId,
        species: listing.species,
      },
    });
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      listingType: listing.listingType,
      species: listing.species,
      breedName: listing.breedName,
      sex: listing.sex,
      city: listing.city,
      breedingMethod: listing.breedingMethod,
      fee:
        listing.priceAmount != null
          ? { amount: listing.priceAmount.toFixed(2), currencyCode: listing.currencyCode }
          : null,
      ownerDisplayName: listing.ownerDisplayName,
      verificationDimensions: listing.verificationDimensions,
      publishedAt: listing.publishedAt,
    };
  }

  async getRepository(): Promise<InMemoryMarketplaceRepository> {
    return this.listings;
  }

  private async requireOwnedListing(id: string, user: AuthenticatedUser): Promise<Listing> {
    const listing = await this.listings.findById(id);
    if (!listing || listing.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    if (listing.ownerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }
    return listing;
  }

  private async requireOwnedPublishReadyAnimal(animalId: string, user: AuthenticatedUser) {
    const animal = await this.animals.findById(animalId);
    if (!animal || animal.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    animalPolicy.assertCanAccess(user, animal);
    if (animal.ownerId !== user.id) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not authorized.', HttpStatus.FORBIDDEN);
    }
    if (animal.breedingStatus !== 'publish_ready') {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Animal must be publish-ready.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return animal;
  }
}

@Injectable()
export class SavedListingsService {
  constructor(
    @Inject(SAVED_LISTINGS_REPOSITORY) private readonly saved: InMemorySavedListingsRepository,
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async save(user: AuthenticatedUser, listingId: string) {
    const listing = await this.listings.findById(listingId);
    if (!listing || listing.deletedAt) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    if (listing.status !== 'active') {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Only active listings can be saved.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.saved.save(user.id, listingId);
    if (result.created) {
      await this.analytics.capture({
        event: 'listing_saved',
        accountId: user.id,
        properties: { listingId },
      });
    }
    return { listingId, savedAt: result.savedAt };
  }

  async unsave(user: AuthenticatedUser, listingId: string): Promise<void> {
    await this.saved.unsave(user.id, listingId);
  }

  async list(user: AuthenticatedUser) {
    const rows = await this.saved.listByUser(user.id);
    const data = await Promise.all(
      rows.map(async (row) => {
        const listing = await this.listings.findById(row.listingId);
        const available = Boolean(listing && listing.status === 'active' && !listing.deletedAt);
        return {
          savedAt: row.createdAt,
          listing: available && listing ? toPublicSummary(listing) : null,
          available,
        };
      }),
    );
    return { data, meta: { nextCursor: null, hasMore: false } };
  }
}
