import assert from 'node:assert/strict';
import test from 'node:test';

import { REQUESTER, seedBreedingFixture } from './fixtures';

test('POST /breeding-requests creates Requested status', async () => {
  const { breeding, female, male, listing, breedingRepo } = await seedBreedingFixture();
  const created = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  assert.equal(created.status, 'Requested');
  const events = await breedingRepo.listEvents(created.id);
  assert.ok(events.some((e) => e.toStatus === 'Requested'));
});
