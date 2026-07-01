import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { OutboxDrainer } from './outbox.drainer';
import { OutboxRepository } from './outbox.repository';
import { BreedingNotificationProducer } from './producers/breeding-notification.producer';

@Module({
  imports: [SupabaseModule],
  controllers: [DevicesController],
  providers: [OutboxRepository, OutboxDrainer, DevicesService, BreedingNotificationProducer],
  exports: [OutboxRepository, OutboxDrainer, DevicesService, BreedingNotificationProducer],
})
export class NotificationsModule {}
