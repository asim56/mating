export const VERIFICATION_APPROVED = 'verification.approved';
export const VERIFICATION_REJECTED = 'verification.rejected';
export const ADMIN_DOCUMENT_ACCESSED = 'admin.document_accessed';

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
    action: 'verification.request_submitted',
    actorId,
    subjectType: 'verification_request',
    subjectId: requestId,
    metadata,
  };
}

export function verificationApprovedEvent(
  actorId: string,
  requestId: string,
  metadata: Record<string, unknown>,
): VerificationAuditEvent {
  return {
    action: VERIFICATION_APPROVED,
    actorId,
    subjectType: 'verification_request',
    subjectId: requestId,
    metadata,
  };
}

export function verificationRejectedEvent(
  actorId: string,
  requestId: string,
  metadata: Record<string, unknown>,
): VerificationAuditEvent {
  return {
    action: VERIFICATION_REJECTED,
    actorId,
    subjectType: 'verification_request',
    subjectId: requestId,
    metadata,
  };
}

export function adminDocumentAccessedEvent(
  actorId: string,
  subjectType: string,
  subjectId: string,
  metadata: Record<string, unknown>,
): VerificationAuditEvent {
  return {
    action: ADMIN_DOCUMENT_ACCESSED,
    actorId,
    subjectType,
    subjectId,
    metadata,
  };
}
