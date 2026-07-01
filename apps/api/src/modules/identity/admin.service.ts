import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { UserRole } from '@mating/shared';

import { ApiError, ERROR_CODES } from '../../common';
import { buildPage, clampLimit } from '../../common/pagination/cursor';
import { SUPABASE_CLIENT } from '../../infra/supabase/tokens';
import type { AuditEmitter } from '../regions/events/region-updated.event';
import { SessionsRepository } from './sessions.repository';

const AUDIT_EMITTER = 'AUDIT_EMITTER';

@Injectable()
export class AdminService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    @Inject(SessionsRepository) private readonly sessions: SessionsRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: AuditEmitter,
  ) {}

  async listUsers(query: {
    q?: string;
    status?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = clampLimit(query.limit);
    let dbQuery = this.client
      .from('profiles')
      .select('account_id, created_at, account_status(status), user_roles(role)')
      .order('created_at', { ascending: false })
      .limit(take + 1);

    if (query.cursor) {
      dbQuery = dbQuery.lt('created_at', query.cursor);
    }

    const { data, error } = await dbQuery;
    if (error) throw new Error(error.message);

    const rows = (data ?? []).map((row) => ({
      id: row.account_id as string,
      status: ((row.account_status as { status?: string } | null)?.status) ?? 'active',
      roles: ((row.user_roles as { role: string }[]) ?? []).map((r) => r.role),
      createdAt: row.created_at as string,
    }));

    const page = buildPage(rows, take, (r) => r.createdAt);
    return { data: page.data, meta: page.meta };
  }

  async updateStatus(actorId: string, targetId: string, status: 'active' | 'suspended', reason?: string) {
    await this.ensureAccount(targetId);
    const { data, error } = await this.client
      .from('account_status')
      .upsert({
        account_id: targetId,
        status,
        reason: reason ?? null,
        changed_by: actorId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await this.audit.emit({
      action: status === 'suspended' ? 'account.suspended' : 'account.reactivated',
      actorId,
      subjectType: 'account',
      subjectId: targetId,
      metadata: reason ? { reason } : {},
    });

    return { id: targetId, status: data.status, reason: data.reason };
  }

  async revokeSessions(actorId: string, targetId: string) {
    await this.ensureAccount(targetId);
    const revoked = await this.sessions.revokeAll(targetId);
    await this.audit.emit({
      action: 'session.revoked',
      actorId,
      subjectType: 'account',
      subjectId: targetId,
      metadata: { revoked },
    });
    return { revoked };
  }

  async grantRole(actorId: string, targetId: string, role: UserRole) {
    await this.ensureAccount(targetId);
    const { error } = await this.client.from('user_roles').insert({
      account_id: targetId,
      role,
      granted_by: actorId,
    });
    if (error && error.code !== '23505') throw new Error(error.message);
    const roles = await this.listRoles(targetId);
    await this.audit.emit({
      action: 'role.granted',
      actorId,
      subjectType: 'account',
      subjectId: targetId,
      metadata: { role },
    });
    return { id: targetId, roles };
  }

  async revokeRole(actorId: string, targetId: string, role: UserRole) {
    await this.ensureAccount(targetId);
    const { error } = await this.client
      .from('user_roles')
      .delete()
      .eq('account_id', targetId)
      .eq('role', role);
    if (error) throw new Error(error.message);
    const roles = await this.listRoles(targetId);
    await this.audit.emit({
      action: 'role.revoked',
      actorId,
      subjectType: 'account',
      subjectId: targetId,
      metadata: { role },
    });
    return { id: targetId, roles };
  }

  private async listRoles(accountId: string): Promise<string[]> {
    const { data } = await this.client
      .from('user_roles')
      .select('role')
      .eq('account_id', accountId);
    return (data ?? []).map((r) => r.role as string);
  }

  private async ensureAccount(accountId: string) {
    const { data } = await this.client
      .from('profiles')
      .select('account_id')
      .eq('account_id', accountId)
      .maybeSingle();
    if (!data) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Account not found.', HttpStatus.NOT_FOUND);
    }
  }
}
