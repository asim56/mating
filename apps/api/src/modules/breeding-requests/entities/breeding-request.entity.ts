import type {
  BreedingMethod,
  BreedingRequestStatus,
  LocationType,
} from '@mating/shared';

export type BreedingRequest = {
  id: string;
  requesterId: string;
  recipientId: string;
  requesterAnimalId: string;
  recipientAnimalId: string;
  listingId: string | null;
  status: BreedingRequestStatus;
  breedingMethod: BreedingMethod;
  proposedAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  locationType: LocationType | null;
  locationDetails: Record<string, unknown>;
  feeAmount: number | null;
  currencyCode: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type BreedingRequestCreate = {
  requesterId: string;
  recipientId: string;
  requesterAnimalId: string;
  recipientAnimalId: string;
  listingId?: string | null;
  breedingMethod: BreedingMethod;
  proposedAt?: string | null;
  locationType?: LocationType | null;
  locationDetails?: Record<string, unknown>;
  currencyCode: string;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type BreedingRequestEvent = {
  id: string;
  requestId: string;
  actorId: string | null;
  eventType: string;
  fromStatus: BreedingRequestStatus | null;
  toStatus: BreedingRequestStatus | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type BreedingRecord = {
  id: string;
  requestId: string;
  requesterAnimalId: string;
  recipientAnimalId: string;
  breedingMethod: BreedingMethod;
  breedingDate: string;
  outcomeStatus: string;
  recordPdfPath: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type Dispute = {
  id: string;
  requestId: string;
  openedBy: string;
  status: 'open';
  reasonCode: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListBreedingRequestsFilter = {
  userId: string;
  role?: 'requester' | 'recipient' | 'all';
  status?: BreedingRequestStatus;
  cursor?: string;
  limit: number;
};
