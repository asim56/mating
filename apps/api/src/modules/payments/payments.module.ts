import { forwardRef, Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { BreedingRequestsModule } from '../breeding-requests/breeding-requests.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WalletLedgerModule } from '../wallet-ledger/wallet-ledger.module';
import { BoostOrdersController, BoostsController } from './boosts.controller';
import { PaymentConfirmedHandler } from './events/payment-confirmed.handler';
import { PaymentsController } from './payments.controller';
import {
  PAYMENTS_REPOSITORY,
  InMemoryPaymentsRepository,
} from './payments.repository';
import { PaymentsService } from './payments.service';
import { AdminProofController, ProofController } from './proof.controller';
import {
  SubscriptionPlansController,
  SubscriptionsController,
} from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [
    AuditModule,
    AnalyticsModule,
    MarketplaceModule,
    NotificationsModule,
    forwardRef(() => BreedingRequestsModule),
    forwardRef(() => WalletLedgerModule),
  ],
  controllers: [
    PaymentsController,
    ProofController,
    AdminProofController,
    WebhookController,
    BoostsController,
    BoostOrdersController,
    SubscriptionPlansController,
    SubscriptionsController,
  ],
  providers: [
    PaymentsService,
    SubscriptionsService,
    PaymentConfirmedHandler,
    {
      provide: PAYMENTS_REPOSITORY,
      useClass: InMemoryPaymentsRepository,
    },
  ],
  exports: [PaymentsService, PAYMENTS_REPOSITORY, SubscriptionsService],
})
export class PaymentsModule {}
