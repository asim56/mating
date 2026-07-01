import assert from 'node:assert/strict';
import test from 'node:test';

import { assertTransitions, type TransitionMap } from '../harness/state-transitions';

test('session active to revoked is terminal', () => {
  const map: TransitionMap<'active' | 'revoked'> = {
    active: ['revoked'],
    revoked: [],
  };
  assertTransitions({
    map,
    allowed: [['active', 'revoked']],
    forbidden: [['revoked', 'active']],
  });
});
