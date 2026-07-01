import { Controller, Get, Param, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { VerificationService } from './verification.service';

@ApiTags('verification')
@ApiBearerAuth()
@Controller('animals/:animalId/verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get()
  @ApiOperation({ summary: 'Per-dimension verification status (never aggregated)' })
  getDimensions(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.verification.getDimensions(animalId, request.user!);
  }
}
