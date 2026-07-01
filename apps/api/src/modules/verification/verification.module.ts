import { Module } from '@nestjs/common';

import { AnimalsModule } from '../animals/animals.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

@Module({
  imports: [AnimalsModule],
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule {}
