import { HttpStatus, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES } from '../../common';
import { SupabaseService } from '../../infra/supabase/supabase.service';

@Injectable()
export class DevicesService {
  constructor(private readonly supabase: SupabaseService) {}

  async register(
    accountId: string,
    input: { pushToken: string; platform: string },
  ): Promise<{ id: string; pushToken: string; platform: string; createdAt: string }> {
    const { data: existing } = await this.supabase.client
      .from('devices')
      .select('id, account_id')
      .eq('push_token', input.pushToken)
      .maybeSingle();

    if (existing && existing.account_id !== accountId) {
      await this.supabase.client.from('devices').delete().eq('id', existing.id);
    }

    const { data, error } = await this.supabase.client
      .from('devices')
      .upsert(
        { account_id: accountId, push_token: input.pushToken, platform: input.platform },
        { onConflict: 'account_id,push_token' },
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      id: data.id,
      pushToken: data.push_token,
      platform: data.platform,
      createdAt: data.created_at,
    };
  }

  async remove(accountId: string, deviceId: string): Promise<{ deleted: boolean }> {
    const { data, error } = await this.supabase.client
      .from('devices')
      .delete()
      .eq('id', deviceId)
      .eq('account_id', accountId)
      .select('id')
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Device not found.', HttpStatus.NOT_FOUND);
    }
    return { deleted: true };
  }
}
