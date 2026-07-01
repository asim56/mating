import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { ConsentsRepository } from './consents.repository';
import { NotificationPreferencesRepository } from './notification-preferences.repository';
import { ProfilesRepository } from './profiles.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [SupabaseModule, AuditModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    ProfilesRepository,
    NotificationPreferencesRepository,
    ConsentsRepository,
  ],
})
export class UsersModule {}
