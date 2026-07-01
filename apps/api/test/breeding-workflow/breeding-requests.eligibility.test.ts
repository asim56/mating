import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { InMemoryMarketplaceRepository } from '../../src/modules/marketplace/marketplace.repository';
import { REQUESTER, RECIPIENT, seedBreedingFixture } from './fixtures';

test('same animal rejected for natural mating', async () => {
  const { breeding, female, listing } = await seedBreedingFixture();
  await assert.rejects(
    () =>
      breeding.create(
        {
          listingId: listing.id,
          requesterAnimalId: female.id,
          recipientAnimalId: female.id,
          breedingMethod: 'natural',
        },
        REQUESTER,
      ),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});

test('same sex rejected for natural mating', async () => {
  const { breeding, listing, animals } = await seedBreedingFixture();
  const female2 = await animals.create({
    ownerId: RECIPIENT.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'female',
    countryCode: 'PK',
    approximateAgeMonths: 24,
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
  await animals.update(female2.id, { ownerDeclaration: true, healthStatus: 'healthy' });
  const female1 = await animals.create({
    ownerId: REQUESTER.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'female',
    countryCode: 'PK',
    approximateAgeMonths: 24,
    verificationDimensions: {
      owner_identity: 'verified',
      media: 'verified',
      health: 'verified',
      vaccination: 'verified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
  await animals.update(female1.id, { ownerDeclaration: true, healthStatus: 'healthy' });
  await assert.rejects(
    () =>
      breeding.create(
        {
          listingId: listing.id,
          requesterAnimalId: female1.id,
          recipientAnimalId: female2.id,
          breedingMethod: 'natural',
        },
        REQUESTER,
      ),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});

test('inactive listing rejected', async () => {
  const { breeding, female, male, listing, listings } = await seedBreedingFixture();
  await listings.setStatus(listing.id, 'paused');
  await assert.rejects(
    () =>
      breeding.create(
        {
          listingId: listing.id,
          requesterAnimalId: female.id,
          recipientAnimalId: male.id,
          breedingMethod: 'natural',
        },
        REQUESTER,
      ),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});
