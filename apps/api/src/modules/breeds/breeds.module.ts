import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AdminBreedsController, BreedsController } from './breeds.controller';
import { BREED_REPOSITORY, InMemoryBreedRepository } from './breeds.repository';
import { BreedsService } from './breeds.service';

@Module({
  imports: [AuditModule],
  controllers: [BreedsController, AdminBreedsController],
  providers: [
    BreedsService,
    { provide: BREED_REPOSITORY, useClass: InMemoryBreedRepository },
  ],
})
export class BreedsModule {}
