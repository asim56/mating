import assert from 'node:assert/strict';
import test from 'node:test';

import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

test('record generation is idempotent', async () => {
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
  await breeding.accept(created.id, RECIPIENT);
  await breeding.schedule(created.id, REQUESTER, { scheduledAt: new Date().toISOString() });
  await breeding.start(created.id, RECIPIENT);
  await breeding.complete(created.id, REQUESTER);

  const first = await breeding.generateRecord(created.id, REQUESTER, 'key-1');
  const second = await breeding.generateRecord(created.id, REQUESTER, 'key-1');
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.record.id, second.record.id);

  const stored = await breedingRepo.findRecordByRequestId(created.id);
  assert.ok(stored);
  assert.equal(stored.id, first.record.id);
});
