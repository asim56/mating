import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnalyticsService } from '../../src/modules/analytics/analytics.service';
import { VerificationDecisionService } from '../../src/modules/verification/verification-decision.service';
import { VerificationQueueService } from '../../src/modules/verification/verification-queue.service';
import { InMemoryVerificationRequestsRepository } from '../../src/modules/verification/verification.repository';
import { ADMIN, PAYER } from '../payments/fixtures';

test('vet approves health verification and updates dimension', async () => {
  const animals = new InMemoryAnimalsRepository();
  const repo = new InMemoryVerificationRequestsRepository();
  const auditEvents: string[] = [];
  const audit = {
    emit: async (e: { action: string }) => {
      auditEvents.push(e.action);
    },
  };
  const analytics = { capture: async () => undefined } as unknown as AnalyticsService;
  const queue = new VerificationQueueService(repo, animals, audit);
  const decisions = new VerificationDecisionService(repo, animals, audit, analytics);

  const animal = await animals.create({
    ownerId: PAYER.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'female',
    countryCode: 'PK',
    approximateAgeMonths: 12,
    verificationDimensions: {
      owner_identity: 'unverified',
      media: 'unverified',
      health: 'unverified',
      vaccination: 'unverified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });

  const submitted = await queue.submit(
    { subjectType: 'animal', subjectId: animal.id, dimension: 'health' },
    PAYER,
  );

  const result = await decisions.approve(submitted.id, {
    id: 'vet-1',
    roles: ['veterinarian'],
  });
  assert.equal(result.status, 'approved');
  assert.equal(result.dimension, 'health');

  const updated = await animals.findById(animal.id);
  assert.equal(updated!.verificationDimensions.health, 'approved');
  assert.ok(auditEvents.includes('verification.approved'));
});
