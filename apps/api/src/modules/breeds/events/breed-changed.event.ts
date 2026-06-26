/**
 * Audit seam for `breeds`.
 *
 * The full audit core (interceptor + append-only `audit_logs`) lands in AUDIT-02.
 * Until then this module depends only on a minimal {@link AuditEmitter} port so
 * breed-taxonomy changes already emit a structured audit event; AUDIT-02 provides
 * the real implementation by binding {@link AUDIT_EMITTER} to its service.
 */

export const AUDIT_EMITTER = 'AUDIT_EMITTER';

/** A single privileged-action audit event. */
export type AuditEvent = {
  /** Stable event name from the audit catalog. */
  action: string;
  /** Authenticated principal performing the action. */
  actorId: string;
  /** Type of the affected entity (e.g. `breed`). */
  subjectType: string;
  /** Identifier of the affected entity (e.g. breed id). */
  subjectId: string;
  /** Action-specific, non-sensitive metadata. */
  metadata?: Record<string, unknown>;
};

export interface AuditEmitter {
  emit(event: AuditEvent): void | Promise<void>;
}

/** Stable audit action names emitted when the breed taxonomy changes. */
export const BREED_CREATED = 'breed.created';
export const BREED_UPDATED = 'breed.updated';

export function breedCreatedEvent(
  actorId: string,
  breedId: string,
  metadata: Record<string, unknown>,
): AuditEvent {
  return {
    action: BREED_CREATED,
    actorId,
    subjectType: 'breed',
    subjectId: breedId,
    metadata,
  };
}

export function breedUpdatedEvent(
  actorId: string,
  breedId: string,
  changedFields: string[],
): AuditEvent {
  return {
    action: BREED_UPDATED,
    actorId,
    subjectType: 'breed',
    subjectId: breedId,
    metadata: { changedFields },
  };
}

/**
 * Default audit emitter used until AUDIT-02 lands: writes a structured line to
 * the application log so privileged actions are observable in the interim.
 */
export class LoggingAuditEmitter implements AuditEmitter {
  emit(event: AuditEvent): void {
    // eslint-disable-next-line no-console
    console.info('[audit]', JSON.stringify(event));
  }
}
