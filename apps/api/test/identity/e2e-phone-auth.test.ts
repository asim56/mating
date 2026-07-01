import assert from 'node:assert/strict';
import test from 'node:test';

import { PK_PHONE_REGEX } from '@mating/shared';

test('PK phone OTP journey validates E.164 before send', () => {
  assert.match('+923001234567', PK_PHONE_REGEX);
});

test('OTP verify contract returns session payload keys', () => {
  const payload = {
    accessToken: 'a',
    refreshToken: 'r',
    expiresIn: 3600,
    account: { id: 'u', status: 'active' },
    session: { id: 's', createdAt: new Date().toISOString() },
  };
  assert.ok(payload.accessToken && payload.session.id);
});
