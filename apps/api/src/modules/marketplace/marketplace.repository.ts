import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { decodeCursor } from '../../common';
import type {
  Listing,
  ListingCreate,
  ListingUpdate,
  ListListingsFilter,
  SavedListing,
} from './entities/listing.entity';

export const MARKETPLACE_REPOSITORY = 'MARKETPLACE_REPOSITORY';
export const SAVED_LISTINGS_REPOSITORY = 'SAVED_LISTINGS_REPOSITORY';

function clone(listing: Listing): Listing {
  return {
    ...listing,
    availability: { ...listing.availability },
    verificationDimensions: { ...listing.verificationDimensions },
  };
}

@Injectable()
export class InMemoryMarketplaceRepository {
  private readonly listings = new Map<string, Listing>();
  private readonly saved = new Map<string, SavedListing>();

  async create(input: ListingCreate): Promise<Listing> {
    const now = new Date().toISOString();
    const listing: Listing = {
      id: randomUUID(),
      animalId: input.animalId,
      ownerId: input.ownerId,
      regionId: input.regionId,
      regionCode: input.regionCode,
      listingType: input.listingType,
      status: 'draft',
      title: input.title,
      description: input.description ?? null,
      breedingMethod: input.breedingMethod,
      priceAmount: input.priceAmount ?? null,
      currencyCode: input.currencyCode,
      availability: input.availability ?? {},
      locationRadiusKm: input.locationRadiusKm ?? null,
      boostActive: false,
      publishedAt: null,
      expiresAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      species: input.species,
      breedId: input.breedId,
      breedName: input.breedName,
      sex: input.sex,
      city: input.city,
      provinceOrState: input.provinceOrState,
      latitude: input.latitude,
      longitude: input.longitude,
      healthStatus: input.healthStatus,
      verificationDimensions: input.verificationDimensions,
      ownerDisplayName: input.ownerDisplayName,
    };
    this.listings.set(listing.id, listing);
    return clone(listing);
  }

  async findById(id: string): Promise<Listing | null> {
    const row = this.listings.get(id);
    return row ? clone(row) : null;
  }

  async findActiveByAnimal(animalId: string): Promise<Listing | null> {
    const match = [...this.listings.values()].find(
      (l) =>
        l.animalId === animalId &&
        !l.deletedAt &&
        (l.status === 'active' || l.status === 'paused' || l.status === 'pending_review'),
    );
    return match ? clone(match) : null;
  }

  async update(id: string, patch: ListingUpdate): Promise<Listing | null> {
    const current = this.listings.get(id);
    if (!current || current.deletedAt) return null;
    const updated: Listing = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.breedingMethod !== undefined ? { breedingMethod: patch.breedingMethod } : {}),
      ...(patch.priceAmount !== undefined ? { priceAmount: patch.priceAmount } : {}),
      ...(patch.availability !== undefined ? { availability: patch.availability } : {}),
      ...(patch.availability !== undefined ? { availability: patch.availability } : {}),
      ...(patch.locationRadiusKm !== undefined ? { locationRadiusKm: patch.locationRadiusKm } : {}),
      ...(patch.listingType !== undefined ? { listingType: patch.listingType } : {}),
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(id, updated);
    return clone(updated);
  }

  async setStatus(id: string, status: Listing['status']): Promise<Listing | null> {
    const current = this.listings.get(id);
    if (!current || current.deletedAt) return null;
    const updated: Listing = {
      ...current,
      status,
      ...(status === 'active' && !current.publishedAt
        ? { publishedAt: new Date().toISOString() }
        : {}),
      updatedAt: new Date().toISOString(),
    };
    this.listings.set(id, updated);
    return clone(updated);
  }

  async listByOwner(filter: ListListingsFilter): Promise<Listing[]> {
    let rows = [...this.listings.values()].filter(
      (l) => l.ownerId === filter.ownerId && !l.deletedAt,
    );
    if (filter.status) {
      rows = rows.filter((l) => l.status === filter.status);
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((l) => l.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1).map(clone);
  }

  async listActive(): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((l) => l.status === 'active' && !l.deletedAt)
      .map(clone);
  }

  async listSuspended(): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((l) => l.status === 'suspended' && !l.deletedAt)
      .map(clone);
  }

  async searchActive(filters: {
    species?: string;
    city?: string;
    regionCode?: string;
    q?: string;
  }): Promise<Listing[]> {
    return [...this.listings.values()]
      .filter((l) => l.status === 'active' && !l.deletedAt)
      .filter((l) => !filters.species || l.species === filters.species)
      .filter((l) => !filters.city || l.city?.toLowerCase() === filters.city.toLowerCase())
      .filter((l) => !filters.regionCode || l.regionCode === filters.regionCode)
      .filter((l) => {
        if (!filters.q) return true;
        const hay = `${l.title} ${l.description ?? ''}`.toLowerCase();
        return hay.includes(filters.q.toLowerCase());
      })
      .map(clone);
  }
}

@Injectable()
export class InMemorySavedListingsRepository {
  private readonly store = new Map<string, SavedListing>();

  private key(userId: string, listingId: string): string {
    return `${userId}::${listingId}`;
  }

  async save(userId: string, listingId: string): Promise<{ created: boolean; savedAt: string }> {
    const existing = this.store.get(this.key(userId, listingId));
    if (existing) {
      return { created: false, savedAt: existing.createdAt };
    }
    const savedAt = new Date().toISOString();
    this.store.set(this.key(userId, listingId), { userId, listingId, createdAt: savedAt });
    return { created: true, savedAt };
  }

  async unsave(userId: string, listingId: string): Promise<boolean> {
    return this.store.delete(this.key(userId, listingId));
  }

  async listByUser(userId: string): Promise<SavedListing[]> {
    return [...this.store.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
