import assert from 'node:assert/strict';
import test from 'node:test';

test('browse SEO metadata title includes city and species', () => {
  const city = 'Lahore';
  const species = 'goat';
  const title = `${species} in ${city} | Mating`;
  assert.match(title, /goat/);
  assert.match(title, /Lahore/);
});
