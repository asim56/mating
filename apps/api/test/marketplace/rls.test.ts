import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';

test('only active listings appear in public search', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const draft = await listings.create({
    animalId: 'a1',
    ownerId: 'o1',
    regionId: 'r1',
    regionCode: 'PK',
    listingType: 'animal',
    title: 'Draft',
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
  const active = await listings.create({
    animalId: 'a2',
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
    sex: 'male',
    city: 'Lahore',
    provinceOrState: null,
    latitude: null,
    longitude: null,
    healthStatus: 'healthy',
    verificationDimensions: draft.verificationDimensions,
    ownerDisplayName: null,
    priceAmount: 100,
    locationRadiusKm: 10,
  });
  await listings.setStatus(active.id, 'active');
  const results = await listings.searchActive({});
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, active.id);
});
