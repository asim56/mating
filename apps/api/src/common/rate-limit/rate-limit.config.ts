import { SetMetadata } from '@nestjs/common';

/** Rate-limit buckets. Closes the missing rate-limit threshold requirement. */
export type RateLimitCategory = 'default' | 'auth' | 'search' | 'messaging' | 'request_creation';

export type RateLimitRule = {
  /** Maximum number of requests allowed within the window. */
  limit: number;
  /** Sliding window size in seconds. */
  windowSeconds: number;
};

/**
 * Authoritative per-category rate-limit matrix. Conservative MVP defaults;
 * tune per region/provider as real traffic data arrives.
 */
export const RATE_LIMITS: Record<RateLimitCategory, RateLimitRule> = {
  default: { limit: 100, windowSeconds: 60 },
  auth: { limit: 10, windowSeconds: 60 },
  search: { limit: 60, windowSeconds: 60 },
  messaging: { limit: 30, windowSeconds: 60 },
  request_creation: { limit: 5, windowSeconds: 60 },
};

export const RATE_LIMIT_METADATA_KEY = 'rate_limit_category';

/** Decorator that tags a route/controller with a rate-limit category. */
export const RateLimit = (category: RateLimitCategory) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, category);

export function ruleFor(category: RateLimitCategory): RateLimitRule {
  return RATE_LIMITS[category];
}
