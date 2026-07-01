import { Inject, Injectable } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ApiEnv } from '@mating/config';

import { API_ENV } from '../../config/app-config.module';

@Injectable()
export class SupabaseService {
  readonly client: SupabaseClient;

  constructor(@Inject(API_ENV) env: ApiEnv) {
    this.client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}
