import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../../infra/supabase/tokens';

@Injectable()
export class ConsentsRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient) {}

  async record(input: {
    accountId: string;
    consentType: string;
    version: string;
    granted: boolean;
  }): Promise<{ id: string; consent_type: string; version: string; granted: boolean; created_at: string }> {
    const { data, error } = await this.client
      .from('consents')
      .insert({
        account_id: input.accountId,
        consent_type: input.consentType,
        version: input.version,
        granted: input.granted,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async latestMarketingOptIn(accountId: string): Promise<boolean> {
    const { data } = await this.client
      .from('consents')
      .select('granted')
      .eq('account_id', accountId)
      .like('consent_type', 'marketing_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.granted ?? false;
  }
}
