import assert from 'node:assert/strict';
import test from 'node:test';

import type { AuthenticatedUser } from '../../src/common';
import { SavedListingsService } from '../../src/modules/marketplace/marketplace.service';
import { InMemoryMarketplaceRepository, InMemorySavedListingsRepository } from '../../src/modules/marketplace/marketplace.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';

const user: AuthenticatedUser = { id: 'user-1', roles: ['buyer'] };

test('save and unsave are idempotent', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const saved = new InMemorySavedListingsRepository();
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const svc = new SavedListingsService(saved, listings, analytics);

  const listing = await listings.create({
    animalId: 'a1',
    ownerId: 'o1',
    regionId: 'r1',
    regionCode: 'PK',
    listingType: 'animal',
    title: 'Active',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    species: 'goat',
    breedId: null,
    breedName: null,
    sex: 'female',
    city: 'Lahore',
    provinceOrState: null,
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: {
      owner_identity: 'unverified',
      media: 'unverified',
      health: 'unverified',
      vaccination: 'unverified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
    ownerDisplayName: null,
    priceAmount: 100,
    locationRadiusKm: 10,
  });
  await listings.setStatus(listing.id, 'active');

  const first = await svc.save(user, listing.id);
  const second = await svc.save(user, listing.id);
  assert.equal(first.listingId, second.listingId);

  await svc.unsave(user, listing.id);
  await svc.unsave(user, listing.id);

  const list = await svc.list(user);
  assert.equal(list.data.filter((r) => r.available).length, 0);
});
