import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import type { AuthenticatedUser } from '../../src/common';
import { InMemoryAnimalMediaRepository } from '../../src/modules/animals/animal-media.repository';
import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { AnimalsService } from '../../src/modules/animals/animals.service';
import { animalPolicy } from '../../src/modules/animals/policies/animal.policy';
import type { AuditEmitter } from '../../src/modules/animals/events/animal.events';
import type { StorageProvider } from '@mating/shared';

const owner: AuthenticatedUser = { id: 'owner-1', roles: ['animal_owner'] };
const other: AuthenticatedUser = { id: 'owner-2', roles: ['animal_owner'] };

function makeService(options?: {
  storage?: StorageProvider;
  audit?: AuditEmitter;
  accountStatus?: string;
}) {
  const animals = new InMemoryAnimalsRepository();
  const media = new InMemoryAnimalMediaRepository();
  const auditEvents: unknown[] = [];
  const audit: AuditEmitter = options?.audit ?? {
    emit: async (e) => {
      auditEvents.push(e);
    },
  };
  const storage: StorageProvider = options?.storage ?? {
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
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              if (table === 'account_status') {
                return { data: { status: options?.accountStatus ?? 'active' } };
              }
              if (table === 'profiles') {
                return { data: { regions: { code: 'PK' } } };
              }
              return { data: { id: 'region-pk' } };
            },
          }),
        }),
      }),
    },
  };
  const svc = new AnimalsService(
    animals,
    media,
    audit,
    storage,
    supabase as never,
  );
  return { svc, animals, media, auditEvents };
}

test('non-owner cannot access animal via policy', async () => {
  const { svc } = makeService();
  const created = await svc.create({ species: 'cattle', sex: 'female' }, owner);
  await assert.rejects(
    () => svc.getById(created.id, other),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});

test('PATCH equivalent: non-owner update returns 403', async () => {
  const { svc } = makeService();
  const created = await svc.create({ species: 'goat', sex: 'male' }, owner);
  await assert.rejects(
    () => svc.update(created.id, { name: 'Hacked' }, other),
    (err: unknown) => err instanceof ApiError && err.code === 'FORBIDDEN',
  );
});

test('animalPolicy denies non-owner', () => {
  const animal = {
    id: 'a1',
    ownerId: 'owner-1',
  } as Parameters<typeof animalPolicy.assertCanAccess>[1];
  assert.throws(() => animalPolicy.assertCanAccess(other, animal));
});
