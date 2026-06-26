import assert from 'node:assert/strict';
import test from 'node:test';

import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '@mating/shared';

import {
  buildPage,
  clampLimit,
  decodeCursor,
  encodeCursor,
} from '../../src/common/pagination/cursor';

test('cursor encode/decode round-trips', () => {
  const value = 'animal_42:2026-06-21T00:00:00.000Z';
  assert.equal(decodeCursor(encodeCursor(value)), value);
});

test('clampLimit applies default and ceiling', () => {
  assert.equal(clampLimit(undefined), PAGINATION_DEFAULT_LIMIT);
  assert.equal(clampLimit(0), PAGINATION_DEFAULT_LIMIT);
  assert.equal(clampLimit(-5), PAGINATION_DEFAULT_LIMIT);
  assert.equal(clampLimit(10), 10);
  assert.equal(clampLimit(10_000), PAGINATION_MAX_LIMIT);
});

test('buildPage returns { data, meta: { nextCursor, hasMore } } and trims the sentinel row', () => {
  const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const page = buildPage(rows, 2, (row) => row.id);

  assert.deepEqual(
    page.data.map((r) => r.id),
    ['a', 'b'],
  );
  assert.equal(page.meta.hasMore, true);
  assert.equal(decodeCursor(page.meta.nextCursor as string), 'b');
});

test('buildPage reports no more pages when rows fit within the limit', () => {
  const page = buildPage([{ id: 'a' }], 2, (row) => row.id);

  assert.equal(page.meta.hasMore, false);
  assert.equal(page.meta.nextCursor, null);
  assert.equal(page.data.length, 1);
});
