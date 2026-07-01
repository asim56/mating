import { Global, Module } from '@nestjs/common';

import { SupabaseModule } from '../supabase/supabase.module';
import { STORAGE_PROVIDER, SupabaseStorageProvider } from './supabase-storage.provider';

export { STORAGE_PROVIDER } from './supabase-storage.provider';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [
    SupabaseStorageProvider,
    { provide: STORAGE_PROVIDER, useExisting: SupabaseStorageProvider },
  ],
  exports: [STORAGE_PROVIDER, SupabaseStorageProvider],
})
export class StorageModule {}
