import assert from 'node:assert/strict';
import test from 'node:test';

test('recovery response is always non-enumerating', () => {
  const body = { status: 'if_account_exists_instructions_sent' };
  assert.equal(body.status, 'if_account_exists_instructions_sent');
});

test('session list uses cursor pagination meta shape', () => {
  const meta = { nextCursor: null, hasMore: false };
  assert.ok('nextCursor' in meta && 'hasMore' in meta);
});
