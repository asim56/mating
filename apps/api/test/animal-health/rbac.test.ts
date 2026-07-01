import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { InMemoryAnimalHealthRepository } from '../../src/modules/animal-health/animal-health.repository';
import { AnimalHealthService } from '../../src/modules/animal-health/animal-health.service';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { PedigreeService } from '../../src/modules/pedigree/pedigree.service';
import { InMemoryPedigreeRepository } from '../../src/modules/pedigree/pedigree.repository';
import type { AuthenticatedUser } from '../../src/common';
import type { StorageProvider } from '@mating/shared';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };
const vet: AuthenticatedUser = { id: 'vet-1', roles: ['veterinarian'] };

async function seedAnimal(animals: InMemoryAnimalsRepository) {
  return animals.create({
    ownerId: owner.id,
    regionCode: 'PK',
    regionId: 'region-pk',
    species: 'cattle',
    sex: 'female',
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

test('vet can POST health record', async () => {
  const animals = new InMemoryAnimalsRepository();
  const animal = await seedAnimal(animals);
  const health = new InMemoryAnimalHealthRepository();
  const storage: StorageProvider = {
    createSignedUploadUrl: async () => ({ url: 'u', expiresAt: new Date().toISOString() }),
    createSignedReadUrl: async () => ({ url: 'u', expiresAt: new Date().toISOString() }),
  };
  const svc = new AnimalHealthService(health, animals, storage);
  const record = await svc.create(
    animal.id,
    { recordType: 'vaccination', title: 'Rabies', recordDate: '2025-06-01' },
    vet,
  );
  assert.equal(record.recordType, 'vaccination');
});

test('vet cannot POST pedigree', async () => {
  const animals = new InMemoryAnimalsRepository();
  const animal = await seedAnimal(animals);
  const pedigree = new InMemoryPedigreeRepository();
  const svc = new PedigreeService(pedigree, animals);
  await assert.rejects(
    () => svc.create(animal.id, { registryName: 'ABC' }, vet),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});
