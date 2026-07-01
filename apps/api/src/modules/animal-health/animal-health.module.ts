import { Module } from '@nestjs/common';

import { StorageModule } from '../../infra/storage/storage.module';
import { AnimalsModule } from '../animals/animals.module';
import { AnimalHealthController } from './animal-health.controller';
import {
  ANIMAL_HEALTH_REPOSITORY,
  InMemoryAnimalHealthRepository,
} from './animal-health.repository';
import { AnimalHealthService } from './animal-health.service';

@Module({
  imports: [AnimalsModule, StorageModule],
  controllers: [AnimalHealthController],
  providers: [
    AnimalHealthService,
    { provide: ANIMAL_HEALTH_REPOSITORY, useClass: InMemoryAnimalHealthRepository },
  ],
})
export class AnimalHealthModule {}
