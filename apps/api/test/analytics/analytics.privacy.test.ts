import assert from 'node:assert/strict';
import test from 'node:test';

import { AnalyticsService } from '../../src/modules/analytics/analytics.service';

test('AnalyticsService strips disallowed PII keys', () => {
  const svc = new AnalyticsService({ client: null } as never);
  const sanitized = svc.sanitize({
    regionCode: 'PK',
    phone: '+923001234567',
    nested: { email: 'a@b.com', role: 'buyer' },
  });

  assert.equal(sanitized.regionCode, 'PK');
  assert.equal(sanitized.phone, undefined);
  assert.deepEqual(sanitized.nested, { role: 'buyer' });
});
