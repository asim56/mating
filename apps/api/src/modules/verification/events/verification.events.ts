export const VERIFICATION_REQUEST_SUBMITTED = 'verification.request_submitted';

export type VerificationAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export function verificationRequestSubmittedEvent(
  actorId: string,
  requestId: string,
  metadata?: Record<string, unknown>,
): VerificationAuditEvent {
  return {
    action: VERIFICATION_REQUEST_SUBMITTED,
    actorId,
    subjectType: 'verification_request',
    subjectId: requestId,
    metadata,
  };
}
