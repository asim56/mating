import { Module } from '@nestjs/common';

import { AnimalsModule } from '../animals/animals.module';
import { PedigreeController } from './pedigree.controller';
import { PEDIGREE_REPOSITORY, InMemoryPedigreeRepository } from './pedigree.repository';
import { PedigreeService } from './pedigree.service';

@Module({
  imports: [AnimalsModule],
  controllers: [PedigreeController],
  providers: [
    PedigreeService,
    { provide: PEDIGREE_REPOSITORY, useClass: InMemoryPedigreeRepository },
  ],
})
export class PedigreeModule {}
