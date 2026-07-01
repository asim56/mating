import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../../infra/storage/storage.module';
import {
  ANIMAL_MEDIA_REPOSITORY,
  InMemoryAnimalMediaRepository,
} from './animal-media.repository';
import { AnimalsController } from './animals.controller';
import { ANIMALS_REPOSITORY, InMemoryAnimalsRepository } from './animals.repository';
import { AnimalsService } from './animals.service';

@Module({
  imports: [AuditModule, StorageModule],
  controllers: [AnimalsController],
  providers: [
    AnimalsService,
    { provide: ANIMALS_REPOSITORY, useClass: InMemoryAnimalsRepository },
    { provide: ANIMAL_MEDIA_REPOSITORY, useClass: InMemoryAnimalMediaRepository },
  ],
  exports: [AnimalsService, ANIMALS_REPOSITORY],
})
export class AnimalsModule {}
