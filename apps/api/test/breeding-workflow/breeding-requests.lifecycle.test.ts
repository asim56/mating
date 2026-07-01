import assert from 'node:assert/strict';
import test from 'node:test';

import { RECIPIENT, REQUESTER, seedBreedingFixture } from './fixtures';

async function fullLifecycle() {
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
  await ctx.breeding.start(created.id, RECIPIENT);
  await ctx.breeding.complete(created.id, REQUESTER);
  const record = await ctx.breeding.generateRecord(created.id, REQUESTER, 'idem-1');
  const closed = await ctx.breeding.close(record.request.id, RECIPIENT);
  return { ...ctx, created, closed };
}

test('lifecycle schedule → close', async () => {
  const { closed } = await fullLifecycle();
  assert.equal(closed.status, 'Closed');
});
