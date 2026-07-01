import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ANIMAL_PUBLISH_READY,
  ANIMAL_SOFT_DELETED,
} from '../../src/modules/animals/events/animal.events';
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
  const auditEvents: { action: string }[] = [];
  const audit: AuditEmitter = {
    emit: async (e) => {
      auditEvents.push(e);
    },
  };
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
  const svc = new AnimalsService(animals, media, audit, storage, supabase as never);
  return { svc, auditEvents };
}

test('publish-ready and soft-delete emit audit events', async () => {
  const { svc, auditEvents } = makeService();
  const animal = await svc.create(
    {
      species: 'goat',
      sex: 'female',
      countryCode: 'PK',
      approximateAgeMonths: 18,
    },
    owner,
  );
  await svc.update(animal.id, { ownerDeclaration: true }, owner);
  await svc.createMediaUploadUrl(animal.id, owner, {
    contentType: 'image/jpeg',
    mediaType: 'image',
    filename: 'photo.jpg',
  });
  await svc.publishReady(animal.id, owner);
  await svc.softDelete(animal.id, owner);

  const actions = auditEvents.map((e) => e.action);
  assert.ok(actions.includes(ANIMAL_PUBLISH_READY));
  assert.ok(actions.includes(ANIMAL_SOFT_DELETED));
});
