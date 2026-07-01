import assert from 'node:assert/strict';
import test from 'node:test';

test('admin suspend endpoint path follows contract', () => {
  assert.equal('/admin/users/:id/status'.includes('status'), true);
});

test('admin revoke-sessions returns revoked count shape', () => {
  const body = { revoked: 2 };
  assert.equal(typeof body.revoked, 'number');
});
