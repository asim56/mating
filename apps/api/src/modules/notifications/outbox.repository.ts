import { Injectable } from '@nestjs/common';

import { SupabaseService } from '../../infra/supabase/supabase.service';

export type OutboxMessage = {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
};

@Injectable()
export class OutboxRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async enqueue(message: OutboxMessage): Promise<{ inserted: boolean }> {
    const { error } = await this.supabase.client.from('outbox_messages').insert({
      aggregate_type: message.aggregateType,
      aggregate_id: message.aggregateId,
      event_type: message.eventType,
      payload: message.payload,
      idempotency_key: message.idempotencyKey,
    });

    if (error?.code === '23505') {
      return { inserted: false };
    }
    if (error) {
      throw new Error(`outbox insert failed: ${error.message}`);
    }
    return { inserted: true };
  }

  async listPending(limit = 50): Promise<
    { id: string; event_type: string; payload: Record<string, unknown> }[]
  > {
    const { data, error } = await this.supabase.client
      .from('outbox_messages')
      .select('id, event_type, payload')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`outbox list failed: ${error.message}`);
    }
    return data ?? [];
  }

  async markDelivered(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('outbox_messages')
      .update({ status: 'delivered', processed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw new Error(`outbox mark delivered failed: ${error.message}`);
    }
  }
}
