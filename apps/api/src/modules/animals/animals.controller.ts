import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { AnimalsService } from './animals.service';
import { toAnimalResponse } from './dto/animal-response.dto';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { ListAnimalsQueryDto } from './dto/list-animals-query.dto';
import {
  MediaUploadUrlDto,
} from './dto/media.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';

@ApiTags('animals')
@ApiBearerAuth()
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft animal' })
  @ApiResponse({ status: 201 })
  async create(
    @Body() dto: CreateAnimalDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const user = request.user!;
    const animal = await this.animals.create(dto, user);
    return toAnimalResponse(animal);
  }

  @Get()
  @ApiOperation({ summary: 'List own animals' })
  async list(
    @Query() query: ListAnimalsQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const page = await this.animals.list(request.user!, query);
    return {
      data: page.data.map((a) => toAnimalResponse(a)),
      meta: page.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get owned animal' })
  async getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const animal = await this.animals.getById(id, request.user!);
    return toAnimalResponse(animal, animal.mediaCount);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft animal' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnimalDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const animal = await this.animals.update(id, dto, request.user!);
    return toAnimalResponse(animal);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete animal' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    await this.animals.softDelete(id, request.user!);
    return { deleted: true };
  }

  @Post(':id/publish-ready')
  @ApiOperation({ summary: 'Mark animal publish-ready after eligibility check' })
  async publishReady(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const animal = await this.animals.publishReady(id, request.user!);
    return toAnimalResponse(animal);
  }

  @Post(':id/media/upload-url')
  @ApiOperation({ summary: 'Mint signed upload URL for animal media' })
  async mediaUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MediaUploadUrlDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.animals.createMediaUploadUrl(id, request.user!, dto);
  }

  @Get(':id/media')
  @ApiOperation({ summary: 'List animal media metadata with signed read URLs' })
  async listMedia(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.animals.listMedia(id, request.user!);
  }
}
