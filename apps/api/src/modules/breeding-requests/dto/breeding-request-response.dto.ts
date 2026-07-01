import type {
  BreedingRecord,
  BreedingRequest,
  BreedingRequestEvent,
} from '../entities/breeding-request.entity';

export function toBreedingRequestResponse(request: BreedingRequest) {
  return {
    id: request.id,
    requesterId: request.requesterId,
    recipientId: request.recipientId,
    requesterAnimalId: request.requesterAnimalId,
    recipientAnimalId: request.recipientAnimalId,
    listingId: request.listingId,
    status: request.status,
    breedingMethod: request.breedingMethod,
    proposedAt: request.proposedAt,
    scheduledAt: request.scheduledAt,
    completedAt: request.completedAt,
    locationType: request.locationType,
    locationDetails: request.locationDetails,
    feeAmount: request.feeAmount,
    currencyCode: request.currencyCode,
    notes: request.notes,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

export function toBreedingRequestDetailResponse(
  request: BreedingRequest,
  events: BreedingRequestEvent[],
) {
  return {
    ...toBreedingRequestResponse(request),
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorId: e.actorId,
      metadata: e.metadata,
      createdAt: e.createdAt,
    })),
  };
}

export function toBreedingRecordResponse(record: BreedingRecord) {
  return {
    id: record.id,
    requestId: record.requestId,
    requesterAnimalId: record.requesterAnimalId,
    recipientAnimalId: record.recipientAnimalId,
    breedingMethod: record.breedingMethod,
    breedingDate: record.breedingDate,
    outcomeStatus: record.outcomeStatus,
    recordPdfPath: record.recordPdfPath,
    metadata: record.metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
