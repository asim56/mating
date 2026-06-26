import { Module } from '@nestjs/common';

import { JwtAuthGuard, RolesGuard } from '../../common';
import { AdminBreedsController, BreedsController } from './breeds.controller';
import { BREED_REPOSITORY, InMemoryBreedRepository } from './breeds.repository';
import { BreedsService } from './breeds.service';
import { AUDIT_EMITTER, LoggingAuditEmitter } from './events/breed-changed.event';

@Module({
  controllers: [BreedsController, AdminBreedsController],
  providers: [
    BreedsService,
    { provide: BREED_REPOSITORY, useClass: InMemoryBreedRepository },
    // Replaced by the audit core's service when AUDIT-02 lands.
    { provide: AUDIT_EMITTER, useClass: LoggingAuditEmitter },
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class BreedsModule {}
