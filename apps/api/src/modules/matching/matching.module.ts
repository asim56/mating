import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AnimalsModule } from '../animals/animals.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

@Module({
  imports: [MarketplaceModule, AnimalsModule, AnalyticsModule],
  controllers: [MatchingController],
  providers: [MatchingService],
})
export class MatchingModule {}
