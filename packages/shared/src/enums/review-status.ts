export const REVIEW_STATUSES = ['pending', 'published', 'hidden', 'flagged'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MODERATION_REASON_CODES = [
  'fraud',
  'cruelty',
  'disease_risk',
  'illegal',
  'harassment',
  'spam',
  'welfare',
  'other',
] as const;
export type ModerationReasonCode = (typeof MODERATION_REASON_CODES)[number];
