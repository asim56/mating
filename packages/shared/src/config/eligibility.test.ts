import assert from 'node:assert/strict';
import test from 'node:test';

import {
  REGION_DEFINITIONS,
  getRegionConfig,
  getRegionDefinition,
  getSpeciesEligibility,
} from './eligibility';

test('PK and US region definitions exist with currency and default locale', () => {
  const pk = getRegionDefinition('PK');
  assert.equal(pk.currencyCode, 'PKR');
  assert.equal(pk.defaultLocale, 'en');
  assert.deepEqual(pk.locales, ['en', 'ur']);
  assert.equal(pk.active, true);

  const us = getRegionDefinition('US');
  assert.equal(us.currencyCode, 'USD');
  assert.equal(us.defaultLocale, 'en');
  assert.equal(us.active, true, 'US dual-launch is active alongside PK');
});

test('PK seeds the Pakistan payment methods; US seeds Stripe', () => {
  assert.deepEqual(getRegionConfig('PK').paymentMethods, [
    'easypaisa',
    'jazzcash',
    'bank_transfer',
  ]);
  assert.deepEqual(getRegionConfig('US').paymentMethods, ['stripe']);
});

test('conservative PK per-species eligibility defaults are readable', () => {
  const cattle = getSpeciesEligibility('PK', 'cattle');
  assert.equal(cattle.minAgeMonths, 18);
  assert.equal(cattle.requiresHealthCheck, true);
  assert.equal(cattle.requiresVaccination, true);

  for (const species of ['cattle', 'buffalo', 'goat', 'sheep', 'dog']) {
    const rule = getSpeciesEligibility('PK', species);
    assert.ok(rule.minAgeMonths > 0, `${species} has a positive minimum age`);
    assert.equal(rule.requiresHealthCheck, true);
  }
});

test('unknown species falls back to the region conservative default', () => {
  const fallback = getSpeciesEligibility('PK', 'camel');
  assert.deepEqual(fallback, REGION_DEFINITIONS.PK.config.eligibility.defaults);
  assert.equal(fallback.minAgeMonths, 12);
});

test('PK compliance lists provincial subdivisions and requires KYC for payments', () => {
  const { compliance } = getRegionConfig('PK');
  assert.ok(compliance.subdivisions.includes('Punjab'));
  assert.ok(compliance.subdivisions.includes('Sindh'));
  assert.equal(compliance.exoticRequiresApproval, true);
  assert.equal(compliance.kycRequiredForPayments, true);
});
