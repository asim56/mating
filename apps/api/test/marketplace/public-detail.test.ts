import assert from 'node:assert/strict';
import test from 'node:test';

import { MarketplaceService } from '../../src/modules/marketplace/marketplace.service';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';

const E164 = /\+[1-9]\d{6,14}/;

test('public listing detail JSON contains no E.164 phone patterns', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const animals = new InMemoryAnimalsRepository();
  const media = new InMemoryAnimalMediaRepository();
  const audit = { emit: async () => undefined };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const svc = new MarketplaceService(listings, animals, media, audit, analytics);

  const listing = await listings.create({
    animalId: 'a1',
    ownerId: 'o1',
    regionId: 'r1',
    regionCode: 'PK',
    listingType: 'animal',
    title: 'Healthy goat',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    priceAmount: 5000,
    locationRadiusKm: 30,
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
    ownerDisplayName: 'Ali',
  });
  await listings.setStatus(listing.id, 'active');
  const detail = await svc.getPublicDetail(listing.id);
  const json = JSON.stringify(detail);
  assert.equal(E164.test(json), false);
  assert.equal('phone' in detail, false);
});
