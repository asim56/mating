import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [SupabaseModule],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
