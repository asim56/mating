import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

test('illegal transition returns INVALID_STATE_TRANSITION', async () => {
  const { breeding, female, male, listing } = await seedBreedingFixture();
  const created = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  await assert.rejects(
    () => breeding.schedule(created.id, REQUESTER, { scheduledAt: new Date().toISOString() }),
    (err: unknown) =>
      err instanceof ApiError && err.code === 'INVALID_STATE_TRANSITION',
  );
});
