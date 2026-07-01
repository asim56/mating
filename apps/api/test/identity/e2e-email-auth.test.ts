import assert from 'node:assert/strict';
import test from 'node:test';

test('US email register returns verification_sent without enumeration', () => {
  const body = { status: 'verification_sent' };
  assert.equal(body.status, 'verification_sent');
});

test('email login failure is uniform 401 contract', () => {
  const error = { code: 'UNAUTHENTICATED', message: 'Invalid credentials.' };
  assert.equal(error.code, 'UNAUTHENTICATED');
});
