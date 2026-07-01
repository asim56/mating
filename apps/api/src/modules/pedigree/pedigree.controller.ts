import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { CreatePedigreeDto } from './dto/create-pedigree.dto';
import { PedigreeService } from './pedigree.service';

@ApiTags('pedigree')
@ApiBearerAuth()
@Controller('animals/:animalId/pedigree')
export class PedigreeController {
  constructor(private readonly pedigree: PedigreeService) {}

  @Post()
  @ApiOperation({ summary: 'Add pedigree entry (owner only)' })
  create(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Body() dto: CreatePedigreeDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.pedigree.create(animalId, dto, request.user!);
  }

  @Get()
  @ApiOperation({ summary: 'List pedigree records' })
  list(
    @Param('animalId', ParseUUIDPipe) animalId: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.pedigree.list(animalId, request.user!);
  }
}
