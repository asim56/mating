import { Module } from '@nestjs/common';

import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { AuditRepository } from './audit.repository';
import { AUDIT_EMITTER, AuditService } from './audit.service';

@Module({
  imports: [SupabaseModule],
  providers: [AuditRepository, AuditService, { provide: AUDIT_EMITTER, useExisting: AuditService }],
  exports: [AUDIT_EMITTER, AuditService, AuditRepository],
})
export class AuditModule {}
