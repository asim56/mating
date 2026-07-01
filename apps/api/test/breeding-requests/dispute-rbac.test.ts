import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { DisputeAdminService } from '../../src/modules/breeding-requests/dispute-admin.service';
import { DisputeRefundService } from '../../src/modules/breeding-requests/services/dispute-refund.service';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from '../breeding-workflow/fixtures';

test('field onboarding rep forbidden on dispute resolve (FR-010)', async () => {
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
  const disputed = await ctx.disputes.openDispute(created.id, { reasonCode: 'other' }, REQUESTER);

  const refunds = { triggerRefund: async () => undefined } as unknown as DisputeRefundService;
  const audit = { emit: async () => undefined };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const admin = new DisputeAdminService(ctx.breedingRepo, refunds, audit, analytics);

  await assert.rejects(
    () =>
      admin.resolve(disputed.dispute.id, { id: 'rep-1', roles: ['field_onboarding_rep'] }, {
        resolutionType: 'no_refund_close',
        resolutionCode: 'other',
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});
