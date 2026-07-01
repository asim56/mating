import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common/errors/api-error';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import {
  type AuditEvent,
  type AuditEmitter,
  REGION_UPDATED,
} from '../../src/modules/regions/events/region-updated.event';
import { InMemoryRegionRepository } from '../../src/modules/regions/regions.repository';
import { RegionsService } from '../../src/modules/regions/regions.service';

class SpyAuditEmitter implements AuditEmitter {
  readonly events: AuditEvent[] = [];
  emit(event: AuditEvent): void {
    this.events.push(event);
  }
}

function makeService() {
  const audit = new SpyAuditEmitter();
  const service = new RegionsService(new InMemoryRegionRepository(), audit);
  return { service, audit };
}

test('listPublic returns only active regions, projected without config', async () => {
  const { service } = makeService();
  const regions = await service.listPublic();

  assert.deepEqual(
    regions.map((r) => r.code).sort(),
    ['PK', 'US'],
  );
  const pk = regions[0]!;
  assert.equal(pk.currencyCode, 'PKR');
  assert.deepEqual(pk.paymentMethods, ['easypaisa', 'jazzcash', 'bank_transfer']);
  assert.ok(!('config' in pk), 'public view must not expose config');
});

test('listAll returns every region including the inactive US', async () => {
  const { service } = makeService();
  const codes = (await service.listAll()).map((r) => r.code).sort();
  assert.deepEqual(codes, ['PK', 'US']);
});

test('getByCode returns the region; unknown code throws 404', async () => {
  const { service } = makeService();
  const pk = await service.getByCode('PK');
  assert.equal(pk.code, 'PK');
  assert.equal(pk.config.eligibility.species.cattle?.minAgeMonths, 18);

  await assert.rejects(
    () => service.getByCode('ZZ'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.NOT_FOUND);
      assert.equal(error.getStatus(), 404);
      return true;
    },
  );
});

test('update applies the patch and emits a region.updated audit event', async () => {
  const { service, audit } = makeService();

  const updated = await service.update('PK', { active: false }, 'user-super-admin');
  assert.equal(updated.active, false);

  assert.equal(audit.events.length, 1);
  const event = audit.events[0]!;
  assert.equal(event.action, REGION_UPDATED);
  assert.equal(event.actorId, 'user-super-admin');
  assert.equal(event.subjectType, 'region');
  assert.equal(event.subjectId, 'PK');
  assert.deepEqual(event.metadata?.changedFields, ['active']);
});

test('update merges config shallowly over existing configuration', async () => {
  const { service } = makeService();

  const updated = await service.update(
    'PK',
    { config: { paymentMethods: ['bank_transfer'] } },
    'user-super-admin',
  );

  assert.deepEqual(updated.config.paymentMethods, ['bank_transfer']);
  // Untouched config keys are preserved by the shallow merge.
  assert.equal(updated.config.eligibility.species.cattle?.minAgeMonths, 18);
});

test('update on an unknown region throws 404 and emits no audit event', async () => {
  const { service, audit } = makeService();

  await assert.rejects(
    () => service.update('ZZ', { active: true }, 'user-super-admin'),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.NOT_FOUND);
      return true;
    },
  );
  assert.equal(audit.events.length, 0);
});
