import assert from 'node:assert/strict';
import test from 'node:test';

import { isOptionalCategory } from '../../src/modules/notifications/notification.policy';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

test('accept transition enqueues outbox message', async () => {
  const { breeding, outbox, female, male, listing } = await seedBreedingFixture();
  const created = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  outbox.messages.length = 0;
  await breeding.accept(created.id, RECIPIENT);
  assert.ok(outbox.messages.some((m) => m.eventType === 'breeding.request_accepted'));
  assert.equal(outbox.messages.at(-1)?.payload.category, 'transactional');
});

test('transactional category bypasses marketing opt-out', () => {
  assert.equal(isOptionalCategory('transactional'), false);
});
