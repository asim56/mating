import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AdminRegionsController, RegionsController } from './regions.controller';
import { InMemoryRegionRepository, REGION_REPOSITORY } from './regions.repository';
import { RegionsService } from './regions.service';

@Module({
  imports: [AuditModule],
  controllers: [RegionsController, AdminRegionsController],
  providers: [
    RegionsService,
    { provide: REGION_REPOSITORY, useClass: InMemoryRegionRepository },
  ],
})
export class RegionsModule {}
