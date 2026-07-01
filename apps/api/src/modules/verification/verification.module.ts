import { Module } from '@nestjs/common';

import { AnimalsModule } from '../animals/animals.module';
import { AuditModule } from '../audit/audit.module';
import { AdminVerificationsController } from './admin-verifications.controller';
import { VerificationController } from './verification.controller';
import { VerificationQueueService } from './verification-queue.service';
import { VerificationService } from './verification.service';
import { VerificationsController } from './verifications.controller';
import {
  VERIFICATION_REQUESTS_REPOSITORY,
  InMemoryVerificationRequestsRepository,
} from './verification.repository';

@Module({
  imports: [AnimalsModule, AuditModule],
  controllers: [VerificationController, VerificationsController, AdminVerificationsController],
  providers: [
    VerificationService,
    VerificationQueueService,
    {
      provide: VERIFICATION_REQUESTS_REPOSITORY,
      useClass: InMemoryVerificationRequestsRepository,
    },
  ],
  exports: [VerificationService, VerificationQueueService],
})
export class VerificationModule {}
