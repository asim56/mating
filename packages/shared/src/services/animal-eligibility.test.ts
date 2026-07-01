import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluatePublishReadyEligibility } from './animal-eligibility';

test('publish-ready blocked when min age not met', () => {
  const result = evaluatePublishReadyEligibility({
    regionCode: 'PK',
    species: 'cattle',
    approximateAgeMonths: 6,
    ownerDeclaration: true,
    imageCount: 2,
    healthStatus: 'healthy',
    sex: 'female',
    countryCode: 'PK',
  });
  assert.equal(result.eligible, false);
  if (!result.eligible) {
    assert.ok(result.missing.includes('min_age'));
  }
});

test('publish-ready blocked without owner declaration', () => {
  const result = evaluatePublishReadyEligibility({
    regionCode: 'PK',
    species: 'goat',
    approximateAgeMonths: 24,
    ownerDeclaration: false,
    imageCount: 1,
    healthStatus: 'healthy',
    sex: 'male',
    countryCode: 'PK',
  });
  assert.equal(result.eligible, false);
  if (!result.eligible) {
    assert.ok(result.missing.includes('owner_declaration'));
  }
});

test('publish-ready blocked without images', () => {
  const result = evaluatePublishReadyEligibility({
    regionCode: 'US',
    species: 'dog',
    approximateAgeMonths: 36,
    ownerDeclaration: true,
    imageCount: 0,
    healthStatus: 'healthy',
    sex: 'female',
    countryCode: 'US',
  });
  assert.equal(result.eligible, false);
  if (!result.eligible) {
    assert.ok(result.missing.includes('image_count'));
  }
});

test('publish-ready blocked when health status is blocked', () => {
  const result = evaluatePublishReadyEligibility({
    regionCode: 'PK',
    species: 'sheep',
    approximateAgeMonths: 24,
    ownerDeclaration: true,
    imageCount: 1,
    healthStatus: 'blocked',
    sex: 'female',
    countryCode: 'PK',
  });
  assert.equal(result.eligible, false);
  if (!result.eligible) {
    assert.ok(result.missing.includes('health_not_blocked'));
  }
});

test('publish-ready succeeds when all requirements met', () => {
  const result = evaluatePublishReadyEligibility({
    regionCode: 'PK',
    species: 'goat',
    approximateAgeMonths: 18,
    ownerDeclaration: true,
    imageCount: 1,
    healthStatus: 'healthy',
    sex: 'female',
    countryCode: 'PK',
  });
  assert.equal(result.eligible, true);
});
