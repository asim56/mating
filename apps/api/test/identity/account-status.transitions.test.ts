import assert from 'node:assert/strict';
import test from 'node:test';

import { assertTransitions, type TransitionMap } from '../harness/state-transitions';

test('account_status transitions active to suspended and back', () => {
  const map: TransitionMap<'active' | 'suspended'> = {
    active: ['suspended'],
    suspended: ['active'],
  };
  assertTransitions({
    map,
    allowed: [
      ['active', 'suspended'],
      ['suspended', 'active'],
    ],
    forbidden: [['active', 'active']],
  });
});
