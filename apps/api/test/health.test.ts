import assert from 'node:assert/strict';
import test from 'node:test';

import { API_PREFIX } from '@mating/shared';

import { ApiError } from '../src/common/errors/api-error';
import { ERROR_CODES } from '../src/common/errors/error-codes';
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
      assert.ok(error instanceof ApiError);
      assert.equal(error.code, ERROR_CODES.SERVICE_UNAVAILABLE);
      assert.equal(error.getStatus(), 503);
      const response = error.getResponse() as {
        code: string;
        message: string;
        details: { status: string; checks: { database: string } };
      };
      assert.equal(response.details.status, 'degraded');
      assert.equal(response.details.checks.database, 'down');
      return true;
    },
  );
});
