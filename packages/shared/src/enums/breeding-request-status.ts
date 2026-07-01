/** Canonical breeding-request statuses (API PascalCase). */
export const BREEDING_REQUEST_STATUS = [
  'Draft',
  'Requested',
  'Accepted',
  'Rejected',
  'PaymentPending',
  'Scheduled',
  'InProgress',
  'Completed',
  'RecordGenerated',
  'Closed',
  'Cancelled',
  'Disputed',
  'Refunded',
] as const;

export type BreedingRequestStatus = (typeof BREEDING_REQUEST_STATUS)[number];

/** DB snake_case values aligned with {@link BREEDING_REQUEST_STATUS}. */
export const BREEDING_REQUEST_STATUS_DB = [
  'draft',
  'requested',
  'accepted',
  'rejected',
  'payment_pending',
  'scheduled',
  'in_progress',
  'completed',
  'record_generated',
  'closed',
  'cancelled',
  'disputed',
  'refunded',
] as const;

export type BreedingRequestStatusDb = (typeof BREEDING_REQUEST_STATUS_DB)[number];

const PASCAL_TO_SNAKE: Record<BreedingRequestStatus, BreedingRequestStatusDb> = {
  Draft: 'draft',
  Requested: 'requested',
  Accepted: 'accepted',
  Rejected: 'rejected',
  PaymentPending: 'payment_pending',
  Scheduled: 'scheduled',
  InProgress: 'in_progress',
  Completed: 'completed',
  RecordGenerated: 'record_generated',
  Closed: 'closed',
  Cancelled: 'cancelled',
  Disputed: 'disputed',
  Refunded: 'refunded',
};

const SNAKE_TO_PASCAL = Object.fromEntries(
  Object.entries(PASCAL_TO_SNAKE).map(([p, s]) => [s, p]),
) as Record<BreedingRequestStatusDb, BreedingRequestStatus>;

export function statusToDb(status: BreedingRequestStatus): BreedingRequestStatusDb {
  return PASCAL_TO_SNAKE[status];
}

export function statusFromDb(status: BreedingRequestStatusDb): BreedingRequestStatus {
  return SNAKE_TO_PASCAL[status];
}
