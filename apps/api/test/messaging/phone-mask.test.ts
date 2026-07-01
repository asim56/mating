import assert from 'node:assert/strict';
import test from 'node:test';

import { PhoneMaskService } from '../../src/modules/messaging/phone-mask.service';

const mask = new PhoneMaskService();

const SAMPLES = [
  'Call me at +923001234567',
  'My number is 0300-1234567',
  'US: (555) 123-4567',
  'US: 555-123-4567',
];

test('100% mask rate pre-acceptance', () => {
  for (const sample of SAMPLES) {
    const { body, phoneRevealed } = mask.prepareBody(sample, 'Requested');
    assert.equal(phoneRevealed, false);
    assert.ok(body?.includes('[phone hidden]'));
    assert.equal(mask.containsPhone(body!), false);
  }
});

test('phones revealed after Accepted', () => {
  const sample = 'Call +923001234567';
  const { body, phoneRevealed } = mask.prepareBody(sample, 'Accepted');
  assert.equal(phoneRevealed, true);
  assert.equal(body, sample);
});
