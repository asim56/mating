import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

test('recipient accept transitions to PaymentPending when listing has fee', async () => {
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
  const accepted = await breeding.accept(created.id, RECIPIENT);
  assert.equal(accepted.status, 'PaymentPending');
});

test('recipient reject transitions to Rejected', async () => {
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
  const rejected = await breeding.reject(created.id, RECIPIENT, 'not available');
  assert.equal(rejected.status, 'Rejected');
});

test('requester cancel from Requested', async () => {
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
  const cancelled = await breeding.cancel(created.id, REQUESTER);
  assert.equal(cancelled.status, 'Cancelled');
});

test('illegal accept from Rejected returns INVALID_STATE_TRANSITION', async () => {
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
  await breeding.reject(created.id, RECIPIENT);
  await assert.rejects(
    () => breeding.accept(created.id, RECIPIENT),
    (err: unknown) =>
      err instanceof ApiError && err.code === 'INVALID_STATE_TRANSITION',
  );
});
