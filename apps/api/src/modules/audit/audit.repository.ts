import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../../infra/supabase/supabase.service';

export type AuditLogRow = {
  actor_id: string | null;
  subject_id: string | null;
  action: string;
  context: Record<string, unknown>;
};

@Injectable()
export class AuditRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async insert(row: AuditLogRow): Promise<void> {
    const { error } = await this.supabase.client.from('audit_logs').insert(row);
    if (error) {
      throw new Error(`audit insert failed: ${error.message}`);
    }
  }
}
