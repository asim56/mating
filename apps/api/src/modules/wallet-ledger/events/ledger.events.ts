export const PAYOUT_REQUESTED = 'payout.requested';
export const PAYOUT_APPROVED = 'payout.approved';
export const PAYOUT_RELEASED = 'payout.released';

export type LedgerAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export function payoutRequestedEvent(
  actorId: string,
  payoutId: string,
  metadata?: Record<string, unknown>,
): LedgerAuditEvent {
  return {
    action: PAYOUT_REQUESTED,
    actorId,
    subjectType: 'payout',
    subjectId: payoutId,
    metadata,
  };
}

export function payoutApprovedEvent(
  adminId: string,
  payoutId: string,
  metadata?: Record<string, unknown>,
): LedgerAuditEvent {
  return {
    action: PAYOUT_APPROVED,
    actorId: adminId,
    subjectType: 'payout',
    subjectId: payoutId,
    metadata,
  };
}

export function payoutReleasedEvent(
  adminId: string,
  payoutId: string,
  metadata?: Record<string, unknown>,
): LedgerAuditEvent {
  return {
    action: PAYOUT_RELEASED,
    actorId: adminId,
    subjectType: 'payout',
    subjectId: payoutId,
    metadata,
  };
}
