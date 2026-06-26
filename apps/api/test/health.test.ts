import assert from 'node:assert/strict';
import test from 'node:test';

import { ServiceUnavailableException } from '@nestjs/common';

import { API_PREFIX } from '@mating/shared';

import type { DatabasePinger } from '../src/modules/health/database.health';
import { HealthController } from '../src/modules/health/health.controller';
import { HealthService } from '../src/modules/health/health.service';

const pingerWith = (reachable: boolean): DatabasePinger => ({
  ping: async () => reachable,
});

test('API uses versioned prefix', () => {
  assert.equal(API_PREFIX, '/api/v1');
});

test('health returns ok with version and db up when database is reachable', async () => {
  const service = new HealthService(pingerWith(true));
  const controller = new HealthController(service);

  const result = await controller.getHealth();

  assert.equal(result.status, 'ok');
  assert.equal(result.service, 'api');
  assert.equal(result.checks.database, 'up');
  assert.ok(result.version.length > 0);
  assert.ok(typeof result.uptimeSeconds === 'number');
  assert.ok(!Number.isNaN(Date.parse(result.timestamp)));
});

test('health returns 503 when database is unreachable', async () => {
  const service = new HealthService(pingerWith(false));
  const controller = new HealthController(service);

  await assert.rejects(
    () => controller.getHealth(),
    (error: unknown) => {
      assert.ok(error instanceof ServiceUnavailableException);
      const response = error.getResponse() as { status: string; checks: { database: string } };
      assert.equal(response.status, 'degraded');
      assert.equal(response.checks.database, 'down');
      return true;
    },
  );
});
