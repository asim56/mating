import { Module } from '@nestjs/common';

import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminVerificationsController } from './admin-verifications.controller';
import { VerificationController } from './verification.controller';
import { VerificationDecisionService } from './verification-decision.service';
import { VerificationDetailService } from './verification-detail.service';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationService } from './verification.service';
import { VerificationsController } from './verifications.controller';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  InMemoryVerificationRequestsRepository,
} from './verification.repository';

@Module({
  imports: [AnimalsModule, AuditModule, AnalyticsModule],
  controllers: [VerificationController, VerificationsController, AdminVerificationsController],
  providers: [
    VerificationService,
    VerificationQueueService,
    VerificationDecisionService,
    VerificationDetailService,
    {
      provide: VERIFICATION_REQUESTS_REPOSITORY,
      useClass: InMemoryVerificationRequestsRepository,
    },
  ],
  exports: [
    VerificationService,
    VerificationQueueService,
    VERIFICATION_REQUESTS_REPOSITORY,
  ],
})
export class VerificationModule {}
