/** Notification preference policy for M1. */
const REQUIRED_CATEGORIES = new Set(['transactional', 'account_security']);

export function isOptionalCategory(category: string): boolean {
  return !REQUIRED_CATEGORIES.has(category);
}

export function marketingSuppressed(marketingOptIn: boolean): boolean {
  return !marketingOptIn;
}
