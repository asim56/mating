import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceController, SavedListingsController } from './marketplace.controller';
import {
  InMemoryMarketplaceRepository,
  InMemorySavedListingsRepository,
  MARKETPLACE_REPOSITORY,
  SAVED_LISTINGS_REPOSITORY,
} from './marketplace.repository';
import { MarketplaceService, SavedListingsService } from './marketplace.service';

@Module({
  imports: [AuditModule, AnalyticsModule, AnimalsModule],
  controllers: [MarketplaceController, SavedListingsController],
  providers: [
    MarketplaceService,
    SavedListingsService,
    { provide: MARKETPLACE_REPOSITORY, useClass: InMemoryMarketplaceRepository },
    { provide: SAVED_LISTINGS_REPOSITORY, useClass: InMemorySavedListingsRepository },
  ],
  exports: [MarketplaceService, MARKETPLACE_REPOSITORY],
})
export class MarketplaceModule {}
