import { forwardRef, Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';
import { AdminPaymentsService } from './admin-payments.service';
import {
  AdminPaymentsController,
  AdminPayoutsController,
} from './admin-payments.controller';
import { LedgerWriterService } from './ledger-writer.service';
import { LEDGER_REPOSITORY, InMemoryLedgerRepository } from './ledger.repository';
import { LedgerController, PayoutAccountsController, PayoutsController } from './payouts.controller';
import { WalletLedgerService } from './wallet-ledger.service';

@Module({
  imports: [AuditModule, forwardRef(() => PaymentsModule)],
  controllers: [
    LedgerController,
    PayoutAccountsController,
    PayoutsController,
    AdminPaymentsController,
    AdminPayoutsController,
  ],
  providers: [
    LedgerWriterService,
    {
      provide: LEDGER_REPOSITORY,
      useClass: InMemoryLedgerRepository,
    },
    WalletLedgerService,
    AdminPaymentsService,
  ],
  exports: [WalletLedgerService, LedgerWriterService, LEDGER_REPOSITORY, AdminPaymentsService],
})
export class WalletLedgerModule {}
