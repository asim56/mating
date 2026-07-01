export const BREEDING_REQUEST_CREATED = 'breeding_request.created';
export const BREEDING_REQUEST_STATUS_CHANGED = 'breeding_request.status_changed';
export const BREEDING_REQUEST_DISPUTE_OPENED = 'breeding_request.dispute_opened';
export const BREEDING_RECORD_GENERATED = 'breeding_record.generated';

export type BreedingAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export function breedingRequestCreatedEvent(
  actorId: string,
  requestId: string,
): BreedingAuditEvent {
  return {
    action: BREEDING_REQUEST_CREATED,
    actorId,
    subjectType: 'breeding_request',
    subjectId: requestId,
  };
}

export function breedingRequestStatusChangedEvent(
  actorId: string,
  requestId: string,
  from: string,
  to: string,
  metadata?: Record<string, unknown>,
): BreedingAuditEvent {
  return {
    action: BREEDING_REQUEST_STATUS_CHANGED,
    actorId,
    subjectType: 'breeding_request',
    subjectId: requestId,
    metadata: { from, to, ...metadata },
  };
}

export function breedingRequestDisputeOpenedEvent(
  actorId: string,
  requestId: string,
  disputeId: string,
): BreedingAuditEvent {
  return {
    action: BREEDING_REQUEST_DISPUTE_OPENED,
    actorId,
    subjectType: 'breeding_request',
    subjectId: requestId,
    metadata: { disputeId },
  };
}

export function breedingRecordGeneratedEvent(
  actorId: string,
  requestId: string,
  recordId: string,
): BreedingAuditEvent {
  return {
    action: BREEDING_RECORD_GENERATED,
    actorId,
    subjectType: 'breeding_record',
    subjectId: recordId,
    metadata: { requestId },
  };
}
