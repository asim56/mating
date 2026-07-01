import { Module, forwardRef } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletLedgerModule } from '../wallet-ledger/wallet-ledger.module';
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
import { DisputeAdminService } from './dispute-admin.service';
import { DisputesAdminController } from './disputes-admin.controller';
import { DisputesService } from './disputes.service';
import { DisputeRefundService } from './services/dispute-refund.service';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    AuditModule,
    AnalyticsModule,
    AnimalsModule,
    MarketplaceModule,
    NotificationsModule,
    forwardRef(() => MessagingModule),
    forwardRef(() => WalletLedgerModule),
  ],
  controllers: [BreedingRequestsController, DisputesController, DisputesAdminController],
  providers: [
    BreedingRequestsService,
    BreedingRecordsService,
    DisputesService,
    DisputeAdminService,
    DisputeRefundService,
    {
      provide: BREEDING_REQUESTS_REPOSITORY,
      useClass: InMemoryBreedingRequestsRepository,
    },
  ],
  exports: [BreedingRequestsService, BREEDING_REQUESTS_REPOSITORY],
})
export class BreedingRequestsModule {}
