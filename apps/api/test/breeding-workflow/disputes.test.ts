import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

async function scheduledRequest() {
  const ctx = await seedBreedingFixture();
  const created = await ctx.breeding.create(
    {
      listingId: ctx.listing.id,
      requesterAnimalId: ctx.female.id,
      recipientAnimalId: ctx.male.id,
      breedingMethod: 'natural',
    },
    REQUESTER,
  );
  await ctx.breeding.accept(created.id, RECIPIENT);
  await ctx.breeding.schedule(created.id, REQUESTER, {
    scheduledAt: new Date().toISOString(),
  });
  return { ...ctx, created };
}

test('open dispute from Scheduled', async () => {
  const { disputes, created } = await scheduledRequest();
  const result = await disputes.openDispute(
    created.id,
    { reasonCode: 'no_show', description: 'missed appointment' },
    REQUESTER,
  );
  assert.equal(result.request.status, 'Disputed');
  assert.equal(result.dispute.status, 'open');
});

test('dispute from Rejected is INVALID_STATE_TRANSITION', async () => {
  const { disputes, breeding, female, male, listing } = await seedBreedingFixture();
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
    () =>
      disputes.openDispute(created.id, { reasonCode: 'other' }, REQUESTER),
    (err: unknown) =>
      err instanceof ApiError && err.code === 'INVALID_STATE_TRANSITION',
  );
});

test('duplicate open dispute returns CONFLICT', async () => {
  const { disputes, created } = await scheduledRequest();
  await disputes.openDispute(created.id, { reasonCode: 'no_show' }, REQUESTER);
  await assert.rejects(
    () => disputes.openDispute(created.id, { reasonCode: 'other' }, RECIPIENT),
    (err: unknown) => err instanceof ApiError && err.code === 'CONFLICT',
  );
});
