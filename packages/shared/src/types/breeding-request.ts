import type { BreedingMethod, DisputeReasonCode, LocationType } from '../constants/breeding';
import type { BreedingRequestStatus } from '../enums/breeding-request-status';
import type { Timestamps } from './index';

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
} & Timestamps & { deletedAt: string | null };

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
  assignedTo: string | null;
  status: 'open' | 'assigned' | 'resolved' | 'closed';
  reasonCode: DisputeReasonCode;
  description: string | null;
  resolution: string | null;
  resolutionType: string | null;
  paymentIntentId: string | null;
  resolvedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ConversationStatus = 'active' | 'frozen' | 'archived';

export type Conversation = {
  id: string;
  requestId: string | null;
  listingId: string | null;
  status: ConversationStatus;
  createdAt: string;
};

export type ConversationParticipant = {
  conversationId: string;
  userId: string;
  role: 'requester' | 'recipient' | 'support';
  joinedAt: string;
};

export type MessageModerationStatus = 'clean' | 'reported' | 'hidden';

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  attachmentPath: string | null;
  moderationStatus: MessageModerationStatus;
  createdAt: string;
  deletedAt: string | null;
};
