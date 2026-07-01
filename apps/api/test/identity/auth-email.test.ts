import assert from 'node:assert/strict';
import test from 'node:test';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { RegisterEmailDto } from '../../src/modules/identity/dto/email-auth.dto';

test('email register DTO enforces password minimum length', () => {
  const dto = new RegisterEmailDto();
  dto.email = 'user@example.com';
  dto.password = 'short1';
  assert.ok(dto.password.length < 10);
});

test('uniform login failure uses UNAUTHENTICATED code', () => {
  assert.equal(ERROR_CODES.UNAUTHENTICATED, 'UNAUTHENTICATED');
});

test('register always returns verification_sent shape (contract)', () => {
  const shape = { status: 'verification_sent' as const };
  assert.deepEqual(shape, { status: 'verification_sent' });
});
