/** Weights for derived reputation score (verification + completion over raw stars). */
export const REPUTATION_WEIGHTS = {
  verification: 0.5,
  completion: 0.3,
  stars: 0.2,
} as const;

/** Days after request completion when reviews may be submitted. */
export const REVIEW_WINDOW_DAYS = 30;

/** Hours after creation when reviewer may edit their review. */
export const REVIEW_EDIT_WINDOW_HOURS = 48;
