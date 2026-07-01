import { Module } from '@nestjs/common';

import { DATABASE_PINGER, HttpDatabasePinger } from './database.health';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService, { provide: DATABASE_PINGER, useClass: HttpDatabasePinger }],
})
export class HealthModule {}
