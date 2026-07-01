import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { OutboxDrainer } from './outbox.drainer';
import { OutboxRepository } from './outbox.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [DevicesController],
  providers: [OutboxRepository, OutboxDrainer, DevicesService],
  exports: [OutboxRepository, OutboxDrainer, DevicesService],
})
export class NotificationsModule {}
