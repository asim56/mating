'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getWebEnv } from '@mating/config';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) {
    const env = getWebEnv();
    client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
