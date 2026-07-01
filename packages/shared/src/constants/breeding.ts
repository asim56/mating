export const BREEDING_METHODS = [
  'natural',
  'artificial_insemination',
  'semen_purchase',
  'record_only',
] as const;

export type BreedingMethod = (typeof BREEDING_METHODS)[number];

export const DISPUTE_REASON_CODES = [
  'no_show',
  'animal_condition',
  'payment_issue',
  'other',
] as const;

export type DisputeReasonCode = (typeof DISPUTE_REASON_CODES)[number];

export const LOCATION_TYPES = [
  'owner_location',
  'breeder_location',
  'clinic',
  'custom',
] as const;

export type LocationType = (typeof LOCATION_TYPES)[number];

/** When phone numbers in messages are revealed (default policy). */
export const PHONE_REVEAL_POLICY = 'accepted_or_scheduled' as const;

export type PhoneRevealPolicy = typeof PHONE_REVEAL_POLICY;

/** Statuses where phone reveal is allowed under default policy. */
export const PHONE_REVEAL_STATUSES = ['Accepted', 'Scheduled', 'InProgress', 'Completed', 'RecordGenerated', 'Closed'] as const;
