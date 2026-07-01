import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { VerificationQueueService } from '../../src/modules/verification/verification-queue.service';
import { InMemoryVerificationRequestsRepository } from '../../src/modules/verification/verification.repository';
import { ADMIN, PAYER } from '../payments/fixtures';

test('verification submit appears in admin pending queue', async () => {
  const animals = new InMemoryAnimalsRepository();
  const repo = new InMemoryVerificationRequestsRepository();
  const audit = { emit: async () => undefined };
  const service = new VerificationQueueService(repo, animals, audit);

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

  const submitted = await service.submit(
    { subjectType: 'animal', subjectId: animal.id, dimension: 'media' },
    PAYER,
  );
  assert.equal(submitted.status, 'pending');

  const queue = await service.listAdmin({ status: 'pending' });
  assert.ok(queue.data.some((row) => row.id === submitted.id));
});
