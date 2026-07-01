import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { SessionGuard } from '../../common/auth/session.guard';
import { AuditModule } from '../audit/audit.module';
import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AdminModule } from './admin.module';
import { MeController } from './me.controller';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';
import { SessionsService } from './sessions.service';
import {
  ProfilesRepository,
  SessionsRepository,
  UserRolesRepository,
} from './sessions.repository';
import { RolesEnrichmentGuard } from '../../common/auth/roles-enrichment.guard';

@Module({
  imports: [SupabaseModule, AnalyticsModule],
  controllers: [IdentityController, MeController],
  providers: [
    IdentityService,
    SessionsService,
    SessionsRepository,
    UserRolesRepository,
    ProfilesRepository,
    RolesEnrichmentGuard,
    SessionGuard,
    { provide: APP_GUARD, useClass: RolesEnrichmentGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
  exports: [
    IdentityService,
    SessionsService,
    SessionsRepository,
    UserRolesRepository,
    ProfilesRepository,
  ],
})
export class IdentityModule {}
