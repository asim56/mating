import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../../infra/supabase/tokens';

export type PreferenceRow = {
  channel: string;
  category: string;
  enabled: boolean;
};

@Injectable()
export class NotificationPreferencesRepository {
  constructor(@Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient) {}

  async list(accountId: string): Promise<PreferenceRow[]> {
    const { data, error } = await this.client
      .from('notification_preferences')
      .select('channel, category, enabled')
      .eq('account_id', accountId);
    if (error) throw new Error(error.message);
    return (data ?? []) as PreferenceRow[];
  }

  async upsert(
    accountId: string,
    preferences: { channel: string; category: string; enabled: boolean }[],
  ): Promise<PreferenceRow[]> {
    for (const pref of preferences) {
      await this.client.from('notification_preferences').upsert(
        { account_id: accountId, ...pref },
        { onConflict: 'account_id,channel,category' },
      );
    }
    return this.list(accountId);
  }
}
