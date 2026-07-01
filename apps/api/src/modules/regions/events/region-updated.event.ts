/**
 * Audit seam for `config/regions`.
 *
 * The full audit core (interceptor + append-only `audit_logs`) lands in AUDIT-02.
 * Until then this module depends only on a minimal {@link AuditEmitter} port so
 * region-config changes already emit a structured audit event; AUDIT-02 provides
 * the real implementation by binding {@link AUDIT_EMITTER} to its service.
 */

export const AUDIT_EMITTER = 'AUDIT_EMITTER';

/** A single privileged-action audit event. */
export type AuditEvent = {
  /** Stable event name from the audit catalog. */
  action: string;
  /** Authenticated principal performing the action. */
  actorId: string;
  /** Type of the affected entity (e.g. `region`). */
  subjectType: string;
  /** Identifier of the affected entity (e.g. region code). */
  subjectId: string;
  /** Action-specific, non-sensitive metadata. */
  metadata?: Record<string, unknown>;
};

export interface AuditEmitter {
  emit(event: AuditEvent): void | Promise<void>;
}

/** Stable audit action name emitted when a region's configuration changes. */
export const REGION_UPDATED = 'region.updated';

export type RegionUpdatedEvent = AuditEvent & {
  action: typeof REGION_UPDATED;
  subjectType: 'region';
};

export function regionUpdatedEvent(
  actorId: string,
  regionCode: string,
  changedFields: string[],
): RegionUpdatedEvent {
  return {
    action: REGION_UPDATED,
    actorId,
    subjectType: 'region',
    subjectId: regionCode,
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
