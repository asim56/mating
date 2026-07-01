import { Inject, Injectable } from '@nestjs/common';

import type { ApiEnv } from '@mating/config';

import { API_ENV } from '../../config/app-config.module';

/**
 * Abstraction over the dependency-readiness probe so the health endpoint can be
 * exercised deterministically in tests without a live database.
 */
export interface DatabasePinger {
  ping(): Promise<boolean>;
}

export const DATABASE_PINGER = 'DATABASE_PINGER';

const DEFAULT_TIMEOUT_MS = 2000;

/**
 * Default readiness probe. Performs a lightweight reachability check against the
 * Supabase endpoint. A non-network HTTP response (even 4xx) still proves the host
 * is reachable; only transport-level failures are treated as "down".
 */
@Injectable()
export class HttpDatabasePinger implements DatabasePinger {
  constructor(@Inject(API_ENV) private readonly env: ApiEnv) {}

  async ping(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      await fetch(`${this.env.SUPABASE_URL}/auth/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}
