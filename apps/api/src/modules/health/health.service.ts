import { Inject, Injectable } from '@nestjs/common';

import { DATABASE_PINGER, type DatabasePinger } from './database.health';
import type { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(@Inject(DATABASE_PINGER) private readonly databasePinger: DatabasePinger) {}

  async getStatus(): Promise<HealthResponseDto> {
    const databaseUp = await this.databasePinger.ping();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      service: 'api',
      version: process.env.npm_package_version ?? '0.0.1',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Number(process.uptime().toFixed(3)),
      checks: {
        database: databaseUp ? 'up' : 'down',
      },
    };
  }
}
