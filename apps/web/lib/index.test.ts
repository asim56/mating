import assert from 'node:assert/strict';
import test from 'node:test';

import { APP_NAME } from './index';

test('app name is defined', () => {
  assert.equal(APP_NAME, 'Mating Marketplace');
});
