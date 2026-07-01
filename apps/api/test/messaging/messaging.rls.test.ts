import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { OUTSIDER, RECIPIENT, REQUESTER, seedBreedingFixture } from '../breeding-workflow/fixtures';

test('non-participant cannot list messages', async () => {
  const { messaging, breeding, female, male, listing } = await seedBreedingFixture();
  const request = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  const conv = await messaging.createConversation(REQUESTER, { requestId: request.id });
  await assert.rejects(
    () => messaging.listMessages(conv.id, OUTSIDER, {}),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});

test('participant can send message', async () => {
  const { messaging, breeding, female, male, listing } = await seedBreedingFixture();
  const request = await breeding.create(
    {
      listingId: listing.id,
      requesterAnimalId: female.id,
      recipientAnimalId: male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  const conv = await messaging.createConversation(REQUESTER, { requestId: request.id });
  const msg = await messaging.sendMessage(conv.id, REQUESTER, {
    body: 'Hello without phone',
  });
  assert.ok(msg.id);
});
