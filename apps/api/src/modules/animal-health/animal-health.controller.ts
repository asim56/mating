import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { AnimalHealthService } from './animal-health.service';
import { CreateHealthRecordDto } from './dto/create-health-record.dto';

@ApiTags('animal-health')
@ApiBearerAuth()
@Controller('animals/:animalId/health-records')
export class AnimalHealthController {
  constructor(private readonly health: AnimalHealthService) {}

  @Post()
  @ApiOperation({ summary: 'Add clinical health record' })
  create(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: CreateHealthRecordDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.health.create(animalId, dto, request.user!);
  }

  @Get()
  @ApiOperation({ summary: 'List health records for owned animal' })
  list(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.health.list(animalId, request.user!);
  }

  @Post(':recordId/read-url')
  @ApiOperation({ summary: 'Mint signed read URL for health record document' })
  readUrl(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.health.createReadUrl(animalId, recordId, request.user!);
  }
}
