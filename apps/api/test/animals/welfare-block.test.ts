import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnimalsService } from '../../src/modules/animals/animals.service';
import type { AuthenticatedUser } from '../../src/common';
import type { AuditEmitter } from '../../src/modules/animals/events/animal.events';
import type { StorageProvider } from '@mating/shared';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };

function makeService() {
  const animals = new InMemoryAnimalsRepository();
  const media = new InMemoryAnimalMediaRepository();
  const audit: AuditEmitter = { emit: async () => undefined };
  const storage: StorageProvider = {
    createSignedUploadUrl: async () => ({
      url: 'https://example.com/upload',
      expiresAt: new Date().toISOString(),
    }),
    createSignedReadUrl: async () => ({
      url: 'https://example.com/read',
      expiresAt: new Date().toISOString(),
    }),
  };
  const supabase = {
    client: {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { regions: { code: 'PK' }, status: 'active' } }),
          }),
        }),
      }),
    },
  };
  return new AnimalsService(animals, media, audit, storage, supabase as never);
}

test('blocked health status rejects publish-ready', async () => {
  const svc = makeService();
  const animal = await svc.create(
    {
      species: 'goat',
      sex: 'female',
      countryCode: 'PK',
      approximateAgeMonths: 24,
    },
    owner,
  );
  await svc.update(
    animal.id,
    { ownerDeclaration: true, healthStatus: 'blocked' },
    owner,
  );
  await svc.createMediaUploadUrl(animal.id, owner, {
    contentType: 'image/jpeg',
    mediaType: 'image',
    filename: 'photo.jpg',
  });
  await assert.rejects(
    () => svc.publishReady(animal.id, owner),
    (err: unknown) => err instanceof ApiError && err.code === 'VALIDATION_FAILED',
  );
});
