import { Module, forwardRef } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BreedingRecordsService } from './breeding-records.service';
import {
  BreedingRequestsController,
  DisputesController,
} from './breeding-requests.controller';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from './breeding-requests.repository';
import { BreedingRequestsService } from './breeding-requests.service';
import { DisputesService } from './disputes.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    AuditModule,
    AnalyticsModule,
    AnimalsModule,
    MarketplaceModule,
    NotificationsModule,
    forwardRef(() => MessagingModule),
  ],
  controllers: [BreedingRequestsController, DisputesController],
  providers: [
    BreedingRequestsService,
    BreedingRecordsService,
    DisputesService,
    {
      provide: BREEDING_REQUESTS_REPOSITORY,
      useClass: InMemoryBreedingRequestsRepository,
    },
  ],
  exports: [BreedingRequestsService, BREEDING_REQUESTS_REPOSITORY],
})
export class BreedingRequestsModule {}
