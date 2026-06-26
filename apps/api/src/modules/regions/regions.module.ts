import { Module } from '@nestjs/common';

import { JwtAuthGuard, RolesGuard } from '../../common';
import { AdminRegionsController, RegionsController } from './regions.controller';
import { InMemoryRegionRepository, REGION_REPOSITORY } from './regions.repository';
import { RegionsService } from './regions.service';
import { AUDIT_EMITTER, LoggingAuditEmitter } from './events/region-updated.event';

@Module({
  controllers: [RegionsController, AdminRegionsController],
  providers: [
    RegionsService,
    { provide: REGION_REPOSITORY, useClass: InMemoryRegionRepository },
    // Replaced by the audit core's service when AUDIT-02 lands.
    { provide: AUDIT_EMITTER, useClass: LoggingAuditEmitter },
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class RegionsModule {}
