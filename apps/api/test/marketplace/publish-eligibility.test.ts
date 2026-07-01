import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import type { AuthenticatedUser } from '../../src/common';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { MarketplaceService } from '../../src/modules/marketplace/marketplace.service';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };

function makeService() {
  const animals = new InMemoryAnimalsRepository();
  const media = new InMemoryAnimalMediaRepository();
  const listings = new InMemoryMarketplaceRepository();
  const audit = { emit: async () => undefined };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  return { svc: new MarketplaceService(listings, animals, media, audit, analytics), animals, listings, media };
}

test('publish rejected when animal not publish-ready', async () => {
  const { svc, animals, listings } = makeService();
  const animal = await animals.create({
    ownerId: owner.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'female',
    verificationDimensions: {
      owner_identity: 'unverified',
      media: 'unverified',
      health: 'unverified',
      vaccination: 'unverified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
  const listing = await listings.create({
    animalId: animal.id,
    ownerId: owner.id,
    regionId: 'region-pk',
    regionCode: 'PK',
    listingType: 'animal',
    title: 'Test',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    priceAmount: 1000,
    locationRadiusKm: 50,
    species: 'goat',
    breedId: null,
    breedName: null,
    sex: 'female',
    city: 'Lahore',
    provinceOrState: null,
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: animal.verificationDimensions,
    ownerDisplayName: null,
  });
  await assert.rejects(
    () => svc.publish(listing.id, owner),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});
