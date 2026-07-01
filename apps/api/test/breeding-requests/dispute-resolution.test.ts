import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { DisputeAdminService } from '../../src/modules/breeding-requests/dispute-admin.service';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { DisputeRefundService } from '../../src/modules/breeding-requests/services/dispute-refund.service';
import { AdminPaymentsService } from '../../src/modules/wallet-ledger/admin-payments.service';
import { RECIPIENT, REQUESTER, seedBreedingFixture } from '../breeding-workflow/fixtures';
import { ADMIN } from '../payments/fixtures';

function makeDisputeAdmin(
  repo: InMemoryBreedingRequestsRepository,
  refunds: DisputeRefundService,
) {
  const audit = { emit: async () => undefined };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  return new DisputeAdminService(repo, refunds, audit, analytics);
}

test('dispute resolve refund_full moves request to Refunded', async () => {
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
  const disputed = await ctx.disputes.openDispute(
    created.id,
    { reasonCode: 'payment_issue' },
    REQUESTER,
  );

  const refunds = {
    triggerRefund: async () => undefined,
  } as unknown as DisputeRefundService;
  const admin = makeDisputeAdmin(ctx.breedingRepo, refunds);

  await admin.assign(disputed.dispute.id, ADMIN, {});
  const resolved = await admin.resolve(disputed.dispute.id, ADMIN, {
    resolutionType: 'refund_full',
    resolutionCode: 'resolved_favor_requester',
  });
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.requestStatus, 'Refunded');
});

test('resolve on closed dispute returns 400', async () => {
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
  const admin = makeDisputeAdmin(ctx.breedingRepo, refunds);
  await admin.resolve(disputed.dispute.id, ADMIN, {
    resolutionType: 'no_refund_close',
    resolutionCode: 'other',
  });

  await assert.rejects(
    () =>
      admin.resolve(disputed.dispute.id, ADMIN, {
        resolutionType: 'no_refund_close',
        resolutionCode: 'other',
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});
