import assert from 'node:assert/strict';
import test from 'node:test';

import { isOptionalCategory } from '../../src/modules/notifications/notification.policy';

test('transactional notifications cannot be disabled', () => {
  assert.equal(isOptionalCategory('transactional'), false);
  assert.equal(isOptionalCategory('account_security'), false);
});

test('marketing category is optional', () => {
  assert.equal(isOptionalCategory('marketing'), true);
});
