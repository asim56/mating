import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
  type PaginatedResponse,
} from '@mating/shared';

export function encodeCursor(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64url').toString('utf8');
}

/**
 * Clamps a caller-supplied limit into the allowed range, applying the default
 * when absent or invalid.
 */
export function clampLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit) || limit < 1) {
    return PAGINATION_DEFAULT_LIMIT;
  }
  return Math.min(Math.floor(limit), PAGINATION_MAX_LIMIT);
}

/**
 * Builds a cursor-paginated response. Callers should fetch `limit + 1` rows; the
 * extra row signals `hasMore` and is dropped from the returned page.
 *
 * @param rows   rows fetched with `limit + 1`
 * @param limit  the requested (clamped) page size
 * @param toCursor maps the last returned row to its opaque cursor
 */
export function buildPage<T>(
  rows: T[],
  limit: number,
  toCursor: (row: T) => string,
): PaginatedResponse<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];
  const nextCursor = hasMore && last !== undefined ? encodeCursor(toCursor(last)) : null;

  return { data, meta: { nextCursor, hasMore } };
}
