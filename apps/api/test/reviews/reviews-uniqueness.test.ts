import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '../../src/common';
import { InMemoryReviewsRepository } from '../../src/modules/reviews/reviews.repository';
import { ReviewsService } from '../../src/modules/reviews/reviews.service';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { RECIPIENT, REQUESTER } from '../breeding-workflow/fixtures';

test('duplicate review rejected with CONFLICT (SC-003)', async () => {
  const reviewsRepo = new InMemoryReviewsRepository();
  const breedingRepo = new InMemoryBreedingRequestsRepository();
  const audit = { emit: async () => undefined };

  const request = await breedingRepo.create({
    requesterId: REQUESTER.id,
    recipientId: RECIPIENT.id,
    requesterAnimalId: 'a1',
    recipientAnimalId: 'a2',
    breedingMethod: 'natural',
    currencyCode: 'PKR',
    metadata: {},
  });
  await breedingRepo.updateStatus(request.id, 'Completed', {
    completedAt: new Date().toISOString(),
  });

  const service = new ReviewsService(reviewsRepo, breedingRepo, audit);
  const dto = {
    requestId: request.id,
    subjectUserId: RECIPIENT.id,
    rating: 4,
    body: 'Great experience',
  };

  await service.create(dto, REQUESTER);
  await assert.rejects(
    () => service.create(dto, REQUESTER),
    (err: unknown) => err instanceof ApiError && err.code === 'CONFLICT',
  );
});
