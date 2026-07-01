import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppConfigModule } from './config/app-config.module';
import { AuthCoreModule } from './config/auth-core.module';
import { StorageModule } from './infra/storage/storage.module';
import { SupabaseModule } from './infra/supabase/supabase.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AnimalHealthModule } from './modules/animal-health/animal-health.module';
import { AnimalsModule } from './modules/animals/animals.module';
import { AuditModule } from './modules/audit/audit.module';
import { AdminModule } from './modules/identity/admin.module';
import { BreedsModule } from './modules/breeds/breeds.module';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { BreedingRequestsModule } from './modules/breeding-requests/breeding-requests.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { MatchingModule } from './modules/matching/matching.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PedigreeModule } from './modules/pedigree/pedigree.module';
import { RegionsModule } from './modules/regions/regions.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletLedgerModule } from './modules/wallet-ledger/wallet-ledger.module';
import { VerificationModule } from './modules/verification/verification.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TrustAdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    AppConfigModule,
    AuthCoreModule,
    SupabaseModule,
    StorageModule,
    AuditModule,
    AnalyticsModule,
    NotificationsModule,
    HealthModule,
    IdentityModule,
    UsersModule,
    AdminModule,
    RegionsModule,
    BreedsModule,
    AnimalsModule,
    AnimalHealthModule,
    PedigreeModule,
    VerificationModule,
    ReviewsModule,
    TrustAdminModule,
    MarketplaceModule,
    MatchingModule,
    BreedingRequestsModule,
    MessagingModule,
    PaymentsModule,
    WalletLedgerModule,
  ],
})
export class AppModule {}
