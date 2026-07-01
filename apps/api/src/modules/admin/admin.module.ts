import { Module, forwardRef } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { AuditModule } from '../audit/audit.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { AnimalsModule } from '../animals/animals.module';
import { BreedingRequestsModule } from '../breeding-requests/breeding-requests.module';
import { VerificationModule } from '../verification/verification.module';
import { WalletLedgerModule } from '../wallet-ledger/wallet-ledger.module';
import { AdminRoleGuardService } from './guards/admin-role.guard';
import { AuditExplorerController } from './audit-explorer.controller';
import { DashboardsController } from './dashboards.controller';
import { ModerationController } from './moderation.controller';
import { AuditExplorerService } from './services/audit-explorer.service';
import { AuditRedactionService } from './services/audit-redaction.service';
import { DashboardsService } from './services/dashboards.service';
import { ModerationService } from './services/moderation.service';
import {
  AUDIT_LOGS_QUERY_REPOSITORY,
  InMemoryAuditLogsQueryRepository,
} from './audit-logs.repository';

@Module({
  imports: [
    AuditModule,
    AnalyticsModule,
    AnimalsModule,
    MarketplaceModule,
    forwardRef(() => VerificationModule),
    forwardRef(() => BreedingRequestsModule),
    forwardRef(() => WalletLedgerModule),
  ],
  controllers: [ModerationController, AuditExplorerController, DashboardsController],
  providers: [
    AdminRoleGuardService,
    AuditRedactionService,
    AuditExplorerService,
    DashboardsService,
    ModerationService,
    {
      provide: AUDIT_LOGS_QUERY_REPOSITORY,
      useClass: InMemoryAuditLogsQueryRepository,
    },
  ],
  exports: [AdminRoleGuardService, AuditRedactionService, ModerationService],
})
export class TrustAdminModule {}
