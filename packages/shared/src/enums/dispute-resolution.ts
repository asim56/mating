export const DISPUTE_STATUSES = ['open', 'assigned', 'investigating', 'resolved'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const DISPUTE_RESOLUTION_TYPES = [
  'refund_full',
  'refund_partial',
  'no_refund_close',
  'cancel_request',
] as const;
export type DisputeResolutionType = (typeof DISPUTE_RESOLUTION_TYPES)[number];

export const DISPUTE_RESOLUTION_CODES = [
  'resolved_favor_requester',
  'resolved_favor_recipient',
  'mutual_agreement',
  'insufficient_evidence',
  'policy_violation',
  'other',
] as const;
export type DisputeResolutionCode = (typeof DISPUTE_RESOLUTION_CODES)[number];
