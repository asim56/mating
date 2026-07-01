import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { ADMIN } from '../payments/fixtures';

test('suspended listing excluded from public search (SC-004)', async () => {
  const listings = new InMemoryMarketplaceRepository();
  const listing = await listings.create({
    animalId: 'animal-1',
    ownerId: 'owner-1',
    regionId: 'region-pk',
    regionCode: 'PK',
    listingType: 'stud_service',
    title: 'Visible listing',
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
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
    ownerDisplayName: null,
  });
  await listings.setStatus(listing.id, 'active');

  const before = await listings.searchActive({ city: 'Lahore' });
  assert.equal(before.length, 1);

  await listings.setStatus(listing.id, 'suspended');
  const after = await listings.searchActive({ city: 'Lahore' });
  assert.equal(after.length, 0);
});
