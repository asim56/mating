import { Inject, Injectable } from '@nestjs/common';

import { REPUTATION_WEIGHTS } from '@mating/shared';

import { REVIEWS_REPOSITORY, InMemoryReviewsRepository } from './reviews.repository';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from '../breeding-requests/breeding-requests.repository';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';

@Injectable()
export class ReputationService {
  constructor(
    @Inject(REVIEWS_REPOSITORY) private readonly reviews: InMemoryReviewsRepository,
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breeding: InMemoryBreedingRequestsRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
  ) {}

  async getForUser(userId: string) {
    const published = await this.reviews.listBySubject({
      subjectUserId: userId,
      status: 'published',
      limit: 1000,
    });

    const excluded = published.filter((r) => r.status !== 'hidden' && r.status !== 'flagged');
    const averageRating =
      excluded.length > 0
        ? excluded.reduce((sum, r) => sum + r.rating, 0) / excluded.length
        : null;

    const animals = await this.animals.listByOwner({ ownerId: userId, limit: 100 });
    let verifiedDimensionCount = 0;
    const badges: Array<{ dimension: string; status: string }> = [];
    for (const animal of animals) {
      for (const [dimension, status] of Object.entries(animal.verificationDimensions)) {
        if (status === 'approved') {
          verifiedDimensionCount += 1;
          badges.push({ dimension, status });
        }
      }
    }

    const requestStats = await this.breeding.countByStatus();
    const completedBreedingCount =
      (requestStats.Completed ?? 0) + (requestStats.RecordGenerated ?? 0);

    const starComponent =
      averageRating !== null ? (averageRating / 5) * REPUTATION_WEIGHTS.stars * 100 : 0;
    const verificationComponent =
      Math.min(verifiedDimensionCount, 6) * (REPUTATION_WEIGHTS.verification / 6) * 100;
    const completionComponent =
      Math.min(completedBreedingCount, 10) * (REPUTATION_WEIGHTS.completion / 10) * 100;
    const score = Math.round(
      Math.min(100, verificationComponent + completionComponent + starComponent),
    );

    return {
      userId,
      score,
      verifiedDimensionCount,
      completedBreedingCount,
      averageRating,
      publishedReviewCount: excluded.length,
      badges,
    };
  }
}
