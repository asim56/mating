import assert from 'node:assert/strict';
import test from 'node:test';

import { SPECIES } from '../constants';
import { BREED_DEFINITIONS, getBreedsForRegion, getBreedsForSpecies } from './breeds';

test('every priority PK species has at least one seeded breed', () => {
  for (const species of SPECIES) {
    const breeds = getBreedsForSpecies('PK', species);
    assert.ok(breeds.length > 0, `${species} has at least one PK breed`);
  }
});

test('breed names are unique within a (species, region)', () => {
  const seen = new Set<string>();
  for (const breed of BREED_DEFINITIONS) {
    const key = `${breed.regionCode}::${breed.species}::${breed.name.toLowerCase()}`;
    assert.ok(!seen.has(key), `duplicate breed ${key}`);
    seen.add(key);
  }
});

test('all seeded breeds link to a known region and species', () => {
  for (const breed of BREED_DEFINITIONS) {
    assert.ok(['PK', 'US'].includes(breed.regionCode), `${breed.name} has a valid region`);
    assert.ok(SPECIES.includes(breed.species), `${breed.name} has a valid species`);
    assert.equal(typeof breed.description, 'string');
  }
});

test('getBreedsForRegion returns only that region', () => {
  const pk = getBreedsForRegion('PK');
  assert.ok(pk.length > 0);
  assert.ok(pk.every((breed) => breed.regionCode === 'PK'));
});

test('known Pakistani breeds are present per species', () => {
  const names = (species: Parameters<typeof getBreedsForSpecies>[1]) =>
    getBreedsForSpecies('PK', species).map((breed) => breed.name);

  assert.ok(names('cattle').includes('Sahiwal'));
  assert.ok(names('buffalo').includes('Nili-Ravi'));
  assert.ok(names('goat').includes('Beetal'));
  assert.ok(names('sheep').includes('Lohi'));
  assert.ok(names('dog').includes('Bully Kutta'));
});
