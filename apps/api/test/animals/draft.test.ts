import assert from 'node:assert/strict';
import test from 'node:test';

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
            maybeSingle: async () => ({ data: { regions: { code: 'PK' }, id: 'region-pk', status: 'active' } }),
          }),
        }),
      }),
    },
  };
  return new AnimalsService(animals, media, audit, storage, supabase as never);
}

test('POST /animals creates draft and GET lists owner animals', async () => {
  const svc = makeService();
  const created = await svc.create(
    { species: 'cattle', sex: 'female', countryCode: 'PK' },
    owner,
  );
  assert.equal(created.breedingStatus, 'draft');

  const list = await svc.list(owner, {});
  assert.equal(list.data.length, 1);
  assert.equal(list.data[0]?.id, created.id);
});

test('draft animal is retrievable by owner', async () => {
  const svc = makeService();
  const created = await svc.create({ species: 'sheep', sex: 'male' }, owner);
  const fetched = await svc.getById(created.id, owner);
  assert.equal(fetched.breedingStatus, 'draft');
});
