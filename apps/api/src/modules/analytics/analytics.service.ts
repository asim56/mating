import { Injectable } from '@nestjs/common';

import { DISALLOWED_ANALYTICS_KEYS } from '@mating/shared';

import { SupabaseService } from '../../infra/supabase/supabase.service';

export type AnalyticsEvent = {
  event: string;
  accountId?: string | null;
  properties?: Record<string, unknown>;
};

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async capture(input: AnalyticsEvent): Promise<void> {
    const properties = this.sanitize(input.properties ?? {});
    const { error } = await this.supabase.client.from('analytics_events').insert({
      event: input.event,
      account_id: input.accountId ?? null,
      properties,
    });
    if (error) {
      throw new Error(`analytics insert failed: ${error.message}`);
    }
  }

  sanitize(properties: Record<string, unknown>): Record<string, unknown> {
    const blocked = new Set<string>(DISALLOWED_ANALYTICS_KEYS);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (blocked.has(key)) {
        continue;
      }
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        out[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        out[key] = value;
      }
    }
    return out;
  }
}
