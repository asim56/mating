import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryAnimalHealthRepository } from '../../src/modules/animal-health/animal-health.repository';
import { AnimalHealthService } from '../../src/modules/animal-health/animal-health.service';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { PedigreeService } from '../../src/modules/pedigree/pedigree.service';
import { InMemoryPedigreeRepository } from '../../src/modules/pedigree/pedigree.repository';
import type { AuthenticatedUser } from '../../src/common';
import type { StorageProvider } from '@mating/shared';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };

async function seedAnimal(animals: InMemoryAnimalsRepository) {
  return animals.create({
    ownerId: owner.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'goat',
    sex: 'male',
    verificationDimensions: {
      owner_identity: 'unverified',
      media: 'unverified',
      health: 'unverified',
      vaccination: 'unverified',
      pedigree: 'unverified',
      facility: 'unverified',
    },
  });
}

test('health record create and list', async () => {
  const animals = new InMemoryAnimalsRepository();
  const animal = await seedAnimal(animals);
  const health = new InMemoryAnimalHealthRepository();
  const storage: StorageProvider = {
    createSignedUploadUrl: async () => ({ url: 'u', expiresAt: new Date().toISOString() }),
    createSignedReadUrl: async () => ({ url: 'u', expiresAt: new Date().toISOString() }),
  };
  const svc = new AnimalHealthService(health, animals, storage);
  await svc.create(
    animal.id,
    { recordType: 'deworming', title: 'Annual', recordDate: '2025-05-01' },
    owner,
  );
  const list = await svc.list(animal.id, owner);
  assert.equal(list.length, 1);
});

test('pedigree defaults to unverified', async () => {
  const animals = new InMemoryAnimalsRepository();
  const animal = await seedAnimal(animals);
  const pedigree = new InMemoryPedigreeRepository();
  const svc = new PedigreeService(pedigree, animals);
  const record = await svc.create(animal.id, { registryNumber: 'REG-1' }, owner);
  assert.equal(record.verificationStatus, 'unverified');
});
