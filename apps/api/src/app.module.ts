import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigModule } from './config/app-config.module';
import { AuthCoreModule } from './config/auth-core.module';
import { SupabaseModule } from './infra/supabase/supabase.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/identity/admin.module';
import { BreedsModule } from './modules/breeds/breeds.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RegionsModule } from './modules/regions/regions.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AppConfigModule,
    AuthCoreModule,
    SupabaseModule,
    AuditModule,
    AnalyticsModule,
    NotificationsModule,
    HealthModule,
    IdentityModule,
    UsersModule,
    AdminModule,
    RegionsModule,
    BreedsModule,
  ],
})
export class AppModule {}
