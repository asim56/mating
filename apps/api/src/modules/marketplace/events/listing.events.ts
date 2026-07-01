export const LISTING_CREATED = 'listing.created';
export const LISTING_UPDATED = 'listing.updated';
export const LISTING_PUBLISHED = 'listing.published';
export const LISTING_PAUSED = 'listing.paused';
export const LISTING_UNPUBLISHED = 'listing.unpublished';

export type AuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

export function listingCreatedEvent(actorId: string, listingId: string): AuditEvent {
  return { action: LISTING_CREATED, actorId, subjectType: 'listing', subjectId: listingId };
}

export function listingUpdatedEvent(
  actorId: string,
  listingId: string,
  changedFields: string[],
): AuditEvent {
  return {
    action: LISTING_UPDATED,
    actorId,
    subjectType: 'listing',
    subjectId: listingId,
    metadata: { changedFields },
  };
}

export function listingPublishedEvent(actorId: string, listingId: string): AuditEvent {
  return { action: LISTING_PUBLISHED, actorId, subjectType: 'listing', subjectId: listingId };
}

export function listingPausedEvent(actorId: string, listingId: string): AuditEvent {
  return { action: LISTING_PAUSED, actorId, subjectType: 'listing', subjectId: listingId };
}

export function listingUnpublishedEvent(actorId: string, listingId: string): AuditEvent {
  return { action: LISTING_UNPUBLISHED, actorId, subjectType: 'listing', subjectId: listingId };
}
