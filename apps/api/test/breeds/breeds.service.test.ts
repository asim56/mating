import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common/errors/api-error';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { BreedsService } from '../../src/modules/breeds/breeds.service';
import { InMemoryBreedRepository } from '../../src/modules/breeds/breeds.repository';
import {
  type AuditEvent,
  type AuditEmitter,
  BREED_CREATED,
  BREED_UPDATED,
} from '../../src/modules/breeds/events/breed-changed.event';

class SpyAuditEmitter implements AuditEmitter {
  readonly events: AuditEvent[] = [];
  emit(event: AuditEvent): void {
    this.events.push(event);
  }
}

function makeService() {
  const audit = new SpyAuditEmitter();
  const service = new BreedsService(new InMemoryBreedRepository(), audit);
  return { service, audit };
}

test('listPublic returns only active breeds without the active flag', async () => {
  const { service } = makeService();
  const breeds = await service.listPublic();

  assert.ok(breeds.length > 0);
  assert.ok(
    breeds.every((breed) => !('active' in breed)),
    'public view omits active',
  );
  assert.ok(breeds.some((breed) => breed.name === 'Sahiwal'));
});

test('listPublic filters by region and species', async () => {
  const { service } = makeService();
  const cattle = await service.listPublic({ regionCode: 'PK', species: 'cattle' });

  assert.ok(cattle.length > 0);
  assert.ok(cattle.every((breed) => breed.species === 'cattle' && breed.regionCode === 'PK'));
});

test('getById returns the breed; unknown id throws 404', async () => {
  const { service } = makeService();
  const all = await service.listAll();
  const found = await service.getById(all[0]!.id);
  assert.equal(found.id, all[0]!.id);

  await assert.rejects(
    () => service.getById('00000000-0000-0000-0000-000000000000'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.NOT_FOUND);
      assert.equal(error.getStatus(), 404);
      return true;
    },
  );
});

test('create adds a breed and emits a breed.created audit event', async () => {
  const { service, audit } = makeService();

  const created = await service.create(
    { regionCode: 'PK', species: 'goat', name: 'Barbari', description: 'Small meat goat.' },
    'user-super-admin',
  );

  assert.equal(created.name, 'Barbari');
  assert.equal(created.active, true);

  assert.equal(audit.events.length, 1);
  const event = audit.events[0]!;
  assert.equal(event.action, BREED_CREATED);
  assert.equal(event.actorId, 'user-super-admin');
  assert.equal(event.subjectType, 'breed');
  assert.equal(event.subjectId, created.id);
});

test('create rejects a duplicate (species, name, region) with 409 and no audit', async () => {
  const { service, audit } = makeService();

  await assert.rejects(
    () => service.create({ regionCode: 'PK', species: 'cattle', name: 'Sahiwal' }, 'admin'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.CONFLICT);
      assert.equal(error.getStatus(), 409);
      return true;
    },
  );
  assert.equal(audit.events.length, 0);
});

test('update applies the patch and emits a breed.updated audit event', async () => {
  const { service, audit } = makeService();
  const [breed] = await service.listAll();

  const updated = await service.update(breed!.id, { active: false }, 'user-super-admin');
  assert.equal(updated.active, false);

  const event = audit.events.at(-1)!;
  assert.equal(event.action, BREED_UPDATED);
  assert.equal(event.subjectId, breed!.id);
  assert.deepEqual(event.metadata?.changedFields, ['active']);
});

test('update renaming into an existing breed name is a 409', async () => {
  const { service } = makeService();
  const all = await service.listAll();
  const sahiwal = all.find((b) => b.name === 'Sahiwal')!;
  const redSindhi = all.find((b) => b.name === 'Red Sindhi')!;

  await assert.rejects(
    () => service.update(redSindhi.id, { name: 'Sahiwal' }, 'admin'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.CONFLICT);
      return true;
    },
  );
  // The clashing target is untouched.
  assert.equal((await service.getById(sahiwal.id)).name, 'Sahiwal');
});

test('update on an unknown breed throws 404 and emits no audit event', async () => {
  const { service, audit } = makeService();

  await assert.rejects(
    () => service.update('00000000-0000-0000-0000-000000000000', { active: true }, 'admin'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.NOT_FOUND);
      return true;
    },
  );
  assert.equal(audit.events.length, 0);
});
