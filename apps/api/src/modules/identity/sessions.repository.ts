import { Injectable } from '@nestjs/common';

import type { SelfSelectableRole, SessionStatus } from '@mating/shared';

import { SupabaseService } from '../../infra/supabase/supabase.service';

export type SessionRow = {
  id: string;
  account_id: string;
  device_descriptor: string | null;
  ip: string | null;
  status: SessionStatus;
  last_seen_at: string;
  created_at: string;
};

@Injectable()
export class SessionsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async mirror(input: {
    id: string;
    accountId: string;
    deviceDescriptor?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }): Promise<SessionRow> {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .upsert(
        {
          id: input.id,
          account_id: input.accountId,
          device_descriptor: input.deviceDescriptor ?? null,
          ip: input.ip ?? null,
          user_agent: input.userAgent ?? null,
          status: 'active',
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select()
      .single();

    if (error) {
      throw new Error(`session mirror failed: ${error.message}`);
    }
    return data as SessionRow;
  }

  async isActive(sessionId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .select('status')
      .eq('id', sessionId)
      .maybeSingle();

    if (error) {
      throw new Error(`session lookup failed: ${error.message}`);
    }
    return data?.status === 'active';
  }

  async listActive(
    accountId: string,
    cursor?: string,
    limit = 21,
  ): Promise<SessionRow[]> {
    let query = this.supabase.client
      .from('sessions')
      .select('id, account_id, device_descriptor, ip, status, last_seen_at, created_at')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`session list failed: ${error.message}`);
    }
    return (data ?? []) as SessionRow[];
  }

  async revokeOne(accountId: string, sessionId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('sessions')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    if (error) {
      throw new Error(`session revoke failed: ${error.message}`);
    }
    return Boolean(data);
  }

  async revokeAll(accountId: string, exceptSessionId?: string): Promise<number> {
    let query = this.supabase.client
      .from('sessions')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('account_id', accountId)
      .eq('status', 'active');

    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId);
    }

    const { data, error } = await query.select('id');
    if (error) {
      throw new Error(`session revoke all failed: ${error.message}`);
    }
    return data?.length ?? 0;
  }
}

@Injectable()
export class UserRolesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async listRoles(accountId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('user_roles')
      .select('role')
      .eq('account_id', accountId);

    if (error) {
      throw new Error(`roles lookup failed: ${error.message}`);
    }
    return (data ?? []).map((row) => row.role as string);
  }

  async assignSelfRole(accountId: string, role: SelfSelectableRole): Promise<void> {
    const { error } = await this.supabase.client.from('user_roles').insert({
      account_id: accountId,
      role,
      granted_by: null,
    });
    if (error && error.code !== '23505') {
      throw new Error(`role assign failed: ${error.message}`);
    }
  }
}

@Injectable()
export class ProfilesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async ensurePhoneProfile(input: {
    accountId: string;
    phone: string;
    role: SelfSelectableRole;
    regionCode?: string;
  }): Promise<boolean> {
    const { data: existing } = await this.supabase.client
      .from('profiles')
      .select('account_id')
      .eq('account_id', input.accountId)
      .maybeSingle();

    if (existing) {
      return false;
    }

    const { data: region } = await this.supabase.client
      .from('regions')
      .select('id')
      .eq('code', input.regionCode ?? 'PK')
      .maybeSingle();

    const { error: profileError } = await this.supabase.client.from('profiles').insert({
      account_id: input.accountId,
      phone: input.phone,
      primary_role: input.role,
      region_id: region?.id ?? null,
      locale: 'en',
      profile_complete: false,
    });
    if (profileError) {
      throw new Error(`profile insert failed: ${profileError.message}`);
    }

    await this.supabase.client.from('account_status').upsert({
      account_id: input.accountId,
      status: 'active',
    });

    return true;
  }

  async ensureEmailProfile(input: {
    accountId: string;
    email: string;
    role: SelfSelectableRole;
    regionCode?: string;
  }): Promise<boolean> {
    const { data: existing } = await this.supabase.client
      .from('profiles')
      .select('account_id')
      .eq('account_id', input.accountId)
      .maybeSingle();

    if (existing) {
      return false;
    }

    const { data: region } = await this.supabase.client
      .from('regions')
      .select('id')
      .eq('code', input.regionCode ?? 'US')
      .maybeSingle();

    const { error: profileError } = await this.supabase.client.from('profiles').insert({
      account_id: input.accountId,
      email: input.email,
      primary_role: input.role,
      region_id: region?.id ?? null,
      locale: 'en',
      profile_complete: false,
    });
    if (profileError) {
      throw new Error(`profile insert failed: ${profileError.message}`);
    }

    await this.supabase.client.from('account_status').upsert({
      account_id: input.accountId,
      status: 'active',
    });

    return true;
  }
}
