import assert from 'node:assert/strict';
import test from 'node:test';

import { COMPATIBILITY_WEIGHT_TOTAL, COMPATIBILITY_WEIGHTS, computeCompatibilityScore } from '@mating/shared';

test('COMPATIBILITY_WEIGHTS sum to 100', () => {
  assert.equal(COMPATIBILITY_WEIGHT_TOTAL, 100);
  assert.equal(Object.values(COMPATIBILITY_WEIGHTS).reduce((a, b) => a + b, 0), 100);
});

test('scorer is deterministic for identical inputs', () => {
  const input = {
    sameSpecies: true,
    sameBreed: true,
    healthStatus: 'healthy',
    hasPedigree: true,
    approvedDimensionCount: 3,
    distanceKm: 10,
    maxDistanceKm: 50,
  };
  const a = computeCompatibilityScore(input);
  const b = computeCompatibilityScore(input);
  assert.equal(a, b);
});
