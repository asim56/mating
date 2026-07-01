import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  OTP_TTL_SECONDS,
  PASSWORD_MIN_LENGTH,
  PK_PHONE_REGEX,
  SELF_SELECTABLE_ROLES,
  US_PHONE_REGEX,
} from '@mating/shared';

test('PK phone regex accepts valid E.164 numbers', () => {
  assert.match('+923001234567', PK_PHONE_REGEX);
  assert.doesNotMatch('+12025550123', PK_PHONE_REGEX);
});

test('US phone regex accepts valid E.164 numbers', () => {
  assert.match('+12025550123', US_PHONE_REGEX);
  assert.doesNotMatch('+923001234567', US_PHONE_REGEX);
});

test('OTP constants match contract defaults', () => {
  assert.equal(OTP_LENGTH, 6);
  assert.equal(OTP_TTL_SECONDS, 300);
  assert.equal(OTP_MAX_ATTEMPTS, 5);
  assert.equal(OTP_RESEND_COOLDOWN_SECONDS, 60);
});

test('password and role constants', () => {
  assert.equal(PASSWORD_MIN_LENGTH, 10);
  assert.deepEqual(SELF_SELECTABLE_ROLES, ['buyer', 'breeder', 'animal_owner']);
});
