import assert from 'node:assert/strict';
import test from 'node:test';

import { VERIFICATION_DIMENSIONS } from '@mating/shared';

import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { VerificationService } from '../../src/modules/verification/verification.service';
import type { AuthenticatedUser } from '../../src/common';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };

test('GET verification returns all dimensions unverified for new animal', async () => {
  const animals = new InMemoryAnimalsRepository();
  const animal = await animals.create({
    ownerId: owner.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'sheep',
    sex: 'female',
    verificationDimensions: Object.fromEntries(
      VERIFICATION_DIMENSIONS.map((d) => [d, 'unverified']),
    ) as never,
  });
  const svc = new VerificationService(animals);
  const result = await svc.getDimensions(animal.id, owner);
  for (const dim of VERIFICATION_DIMENSIONS) {
    assert.equal(result.dimensions[dim], 'unverified');
  }
});
