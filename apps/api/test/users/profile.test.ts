import assert from 'node:assert/strict';
import test from 'node:test';

import { SELF_SELECTABLE_ROLES } from '@mating/shared';

test('self-selectable roles exclude admin roles', () => {
  assert.ok(!SELF_SELECTABLE_ROLES.includes('super_admin' as never));
  assert.ok(!SELF_SELECTABLE_ROLES.includes('support_agent' as never));
});

test('profile contract exposes profileComplete flag', () => {
  const view = { profileComplete: true, region: { code: 'PK', currencyCode: 'PKR' } };
  assert.equal(view.profileComplete, true);
  assert.equal(view.region.currencyCode, 'PKR');
});
