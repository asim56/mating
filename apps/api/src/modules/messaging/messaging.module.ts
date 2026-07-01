import { Module, forwardRef } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { BreedingRequestsModule } from '../breeding-requests/breeding-requests.module';
import { MarketplaceModule } from '../marketplace/marketplace.module';
import {
  AdminConversationsController,
  MessagesController,
  MessagingController,
} from './messaging.controller';
import { InMemoryMessagingRepository, MESSAGING_REPOSITORY } from './messaging.repository';
import { MessagingService } from './messaging.service';
import { PhoneMaskService } from './phone-mask.service';

@Module({
  imports: [AuditModule, forwardRef(() => BreedingRequestsModule), MarketplaceModule],
  controllers: [MessagingController, MessagesController, AdminConversationsController],
  providers: [
    MessagingService,
    PhoneMaskService,
    { provide: MESSAGING_REPOSITORY, useClass: InMemoryMessagingRepository },
  ],
  exports: [MessagingService, MESSAGING_REPOSITORY, PhoneMaskService],
})
export class MessagingModule {}
