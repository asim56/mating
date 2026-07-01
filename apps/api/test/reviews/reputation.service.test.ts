import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryAnimalsRepository } from '../../src/modules/animals/animals.repository';
import { InMemoryBreedingRequestsRepository } from '../../src/modules/breeding-requests/breeding-requests.repository';
import { InMemoryReviewsRepository } from '../../src/modules/reviews/reviews.repository';
import { ReputationService } from '../../src/modules/reviews/reputation.service';

test('hidden reviews excluded from reputation aggregate', async () => {
  const reviewsRepo = new InMemoryReviewsRepository();
  const breedingRepo = new InMemoryBreedingRequestsRepository();
  const animals = new InMemoryAnimalsRepository();
  const service = new ReputationService(reviewsRepo, breedingRepo, animals);

  const userId = 'subject-user';
  await reviewsRepo.create({
    requestId: 'req-1',
    reviewerId: 'rev-1',
    subjectUserId: userId,
    rating: 5,
    status: 'published',
  });
  await reviewsRepo.create({
    requestId: 'req-2',
    reviewerId: 'rev-2',
    subjectUserId: userId,
    rating: 1,
    status: 'hidden',
  });
  await reviewsRepo.create({
    requestId: 'req-3',
    reviewerId: 'rev-3',
    subjectUserId: userId,
    rating: 2,
    status: 'flagged',
  });

  const summary = await service.getForUser(userId);
  assert.equal(summary.publishedReviewCount, 1);
  assert.equal(summary.averageRating, 5);
});
