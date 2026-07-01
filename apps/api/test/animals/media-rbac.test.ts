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
const other: AuthenticatedUser = { id: 'owner-2', roles: ['animal_owner'] };

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

test('non-owner media upload-url returns 403', async () => {
  const svc = makeService();
  const animal = await svc.create({ species: 'dog', sex: 'male' }, owner);
  await assert.rejects(
    () =>
      svc.createMediaUploadUrl(animal.id, other, {
        contentType: 'image/jpeg',
        mediaType: 'image',
        filename: 'x.jpg',
      }),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});
