/**
 * Audit events for animal lifecycle actions.
 */

export const ANIMAL_UPDATED = 'animal.updated';
export const ANIMAL_PUBLISH_READY = 'animal.publish_ready';
export const ANIMAL_SOFT_DELETED = 'animal.soft_deleted';

export type AuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export interface AuditEmitter {
  emit(event: AuditEvent): void | Promise<void>;
}

export function animalUpdatedEvent(
  actorId: string,
  animalId: string,
  changedFields: string[],
): AuditEvent {
  return {
    action: ANIMAL_UPDATED,
    actorId,
    subjectType: 'animal',
    subjectId: animalId,
    metadata: { changedFields },
  };
}

export function animalPublishReadyEvent(actorId: string, animalId: string): AuditEvent {
  return {
    action: ANIMAL_PUBLISH_READY,
    actorId,
    subjectType: 'animal',
    subjectId: animalId,
  };
}

export function animalSoftDeletedEvent(actorId: string, animalId: string): AuditEvent {
  return {
    action: ANIMAL_SOFT_DELETED,
    actorId,
    subjectType: 'animal',
    subjectId: animalId,
  };
}
