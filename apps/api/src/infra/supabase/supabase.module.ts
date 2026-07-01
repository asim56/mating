import { Global, Module } from '@nestjs/common';

import { SupabaseService } from './supabase.service';
import { SUPABASE_CLIENT } from './tokens';

export { SUPABASE_CLIENT } from './tokens';

@Global()
@Module({
  providers: [
    SupabaseService,
    {
      provide: SUPABASE_CLIENT,
      inject: [SupabaseService],
      useFactory: (svc: SupabaseService) => svc.client,
    },
  ],
  exports: [SupabaseService, SUPABASE_CLIENT],
})
export class SupabaseModule {}
