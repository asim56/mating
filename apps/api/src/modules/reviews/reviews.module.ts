import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { BreedingRequestsModule } from '../breeding-requests/breeding-requests.module';
import { ReviewsAdminController } from './reviews-admin.controller';
import { ReviewsController } from './reviews.controller';
import { REVIEWS_REPOSITORY, InMemoryReviewsRepository } from './reviews.repository';
import { ReviewsService } from './reviews.service';
import { ReputationService } from './reputation.service';

@Module({
  imports: [AuditModule, AnalyticsModule, AnimalsModule, BreedingRequestsModule],
  controllers: [ReviewsController, ReviewsAdminController],
  providers: [
    ReviewsService,
    ReputationService,
    {
      provide: REVIEWS_REPOSITORY,
      useClass: InMemoryReviewsRepository,
    },
  ],
  exports: [ReviewsService, ReputationService, REVIEWS_REPOSITORY],
})
export class ReviewsModule {}
