import { HttpStatus } from '@nestjs/common';

import {
  DISPUTE_REASON_CODES,
  evaluatePublishReadyEligibility,
  type BreedingMethod,
  type DisputeReasonCode,
} from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../../common';
import type { Animal } from '../../animals/entities/animal.entity';
import type { Listing } from '../../marketplace/entities/listing.entity';
import type { BreedingRequest } from '../entities/breeding-request.entity';

const OPEN_STATUSES = new Set([
  'Requested',
  'Accepted',
  'PaymentPending',
  'Scheduled',
  'InProgress',
  'Completed',
]);

export function assertParticipant(
  request: BreedingRequest,
  user: AuthenticatedUser,
): 'requester' | 'recipient' {
  if (request.requesterId === user.id) return 'requester';
  if (request.recipientId === user.id) return 'recipient';
  throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not a participant.', HttpStatus.FORBIDDEN);
}

export function assertRecipient(request: BreedingRequest, user: AuthenticatedUser): void {
  if (request.recipientId !== user.id) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Recipient only.', HttpStatus.FORBIDDEN);
  }
}

export function assertRequester(request: BreedingRequest, user: AuthenticatedUser): void {
  if (request.requesterId !== user.id) {
    throw new ApiError(ERROR_CODES.FORBIDDEN, 'Requester only.', HttpStatus.FORBIDDEN);
  }
}

export function validateCreateEligibility(input: {
  requesterAnimal: Animal;
  recipientAnimal: Animal;
  listing: Listing | null;
  breedingMethod: BreedingMethod;
  requesterId: string;
}): void {
  const { requesterAnimal, recipientAnimal, listing, breedingMethod, requesterId } = input;
  const messages: string[] = [];

  if (requesterAnimal.deletedAt || recipientAnimal.deletedAt) {
    messages.push('Animals must not be deleted.');
  }
  if (requesterAnimal.healthStatus === 'blocked' || recipientAnimal.healthStatus === 'blocked') {
    messages.push('Animal health status is blocked.');
  }
  if (breedingMethod !== 'record_only' && requesterAnimal.id === recipientAnimal.id) {
    messages.push('Cannot breed the same animal.');
  }
  if (breedingMethod === 'natural') {
    if (!requesterAnimal.sex || !recipientAnimal.sex) {
      messages.push('Sex is required for natural mating.');
    } else if (requesterAnimal.sex === recipientAnimal.sex) {
      messages.push('Natural mating requires opposite sex.');
    }
  }
  if (listing) {
    if (listing.status !== 'active' || listing.deletedAt) {
      messages.push('Listing must be active.');
    }
    if (listing.ownerId !== recipientAnimal.ownerId) {
      messages.push('Listing owner must match recipient animal owner.');
    }
  }
  if (requesterAnimal.ownerId !== requesterId) {
    messages.push('Requester must own requester animal.');
  }

  for (const animal of [requesterAnimal, recipientAnimal]) {
    const eligibility = evaluatePublishReadyEligibility({
      regionCode: animal.regionCode,
      species: animal.species,
      dateOfBirth: animal.dateOfBirth,
      approximateAgeMonths: animal.approximateAgeMonths,
      ownerDeclaration: animal.ownerDeclaration,
      imageCount: 1,
      healthStatus: animal.healthStatus,
      sex: animal.sex,
      countryCode: animal.countryCode,
    });
    if (!eligibility.eligible) {
      messages.push(...eligibility.messages);
    }
  }

  if (messages.length > 0) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      messages.join(' '),
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function assertValidDisputeReason(reasonCode: string): asserts reasonCode is DisputeReasonCode {
  if (!DISPUTE_REASON_CODES.includes(reasonCode as DisputeReasonCode)) {
    throw new ApiError(
      ERROR_CODES.VALIDATION_FAILED,
      'Invalid dispute reason code.',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function hasOpenDuplicate(
  existing: BreedingRequest[],
  listingId: string | null,
  requesterAnimalId: string,
  recipientAnimalId: string,
): boolean {
  return existing.some(
    (r) =>
      !r.deletedAt &&
      OPEN_STATUSES.has(r.status) &&
      r.requesterAnimalId === requesterAnimalId &&
      r.recipientAnimalId === recipientAnimalId &&
      r.listingId === listingId,
  );
}
