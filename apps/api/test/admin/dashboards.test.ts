import assert from 'node:assert/strict';
import test from 'node:test';

import { DashboardsService } from '../../src/modules/admin/services/dashboards.service';
import { InMemoryVerificationRequestsRepository } from '../../src/modules/verification/verification.repository';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { ADMIN } from '../payments/fixtures';

test('dashboard summary excludes health and payment proof content', async () => {
  const verifications = new InMemoryVerificationRequestsRepository();
  const breeding = new InMemoryBreedingRequestsRepository();
  const audit = { emit: async () => undefined };
  const service = new DashboardsService(verifications, breeding, audit);

  const summary = await service.summary(ADMIN, { period: '30d' });
  const json = JSON.stringify(summary);
  assert.ok(!json.includes('healthRecord'));
  assert.ok(!json.includes('proofPath'));
  assert.ok(summary.metrics.verificationThroughput);
});
