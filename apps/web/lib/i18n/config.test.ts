import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultLocale,
  dirForLocale,
  getMessages,
  isLocale,
  isRtl,
  locales,
  translate,
} from './config';

test('toggling locale flips layout direction', () => {
  assert.equal(dirForLocale('en'), 'ltr');
  assert.equal(dirForLocale('ur'), 'rtl');
  assert.equal(isRtl('ur'), true);
  assert.equal(isRtl('en'), false);
});

test('isLocale narrows supported locales only', () => {
  assert.equal(isLocale('en'), true);
  assert.equal(isLocale('ur'), true);
  assert.equal(isLocale('fr'), false);
  assert.equal(defaultLocale, 'en');
});

test('translate resolves keys and falls back to the default locale then the key', () => {
  assert.equal(translate('en', 'app.heading'), 'Animal Breeding Marketplace');
  assert.notEqual(translate('ur', 'app.heading'), 'app.heading');
  assert.equal(translate('en', 'missing.key'), 'missing.key');
});

test('every locale defines the same message keys (no hardcoded/missing copy)', () => {
  const baseKeys = Object.keys(getMessages(defaultLocale)).sort();
  for (const locale of locales) {
    const keys = Object.keys(getMessages(locale)).sort();
    assert.deepEqual(keys, baseKeys, `locale ${locale} has divergent message keys`);
    for (const key of keys) {
      assert.ok(getMessages(locale)[key]!.length > 0, `empty translation for ${locale}.${key}`);
    }
  }
});
