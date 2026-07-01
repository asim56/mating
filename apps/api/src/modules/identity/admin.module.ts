import { Module, forwardRef } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { SupabaseModule } from '../../infra/supabase/supabase.module';
import { IdentityModule } from './identity.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [SupabaseModule, AuditModule, forwardRef(() => IdentityModule)],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
