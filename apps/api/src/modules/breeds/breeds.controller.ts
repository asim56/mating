import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type AuthenticatedUser, Public, Roles } from '../../common';
import { BreedsService } from './breeds.service';
import { BreedDto, BreedPublicDto } from './dto/breed-response.dto';
import { CreateBreedDto } from './dto/create-breed.dto';
import { ListBreedsQueryDto } from './dto/list-breeds-query.dto';
import { UpdateBreedDto } from './dto/update-breed.dto';
import type { Breed, BreedPublicView } from './entities/breed.entity';

/** Public reference data: active breeds, optionally filtered by region/species. */
@ApiTags('breeds')
@Controller('breeds')
export class BreedsController {
  constructor(private readonly breeds: BreedsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active breeds (public reference data)' })
  @ApiResponse({ status: 200, type: [BreedPublicDto] })
  list(@Query() query: ListBreedsQueryDto): Promise<BreedPublicView[]> {
    return this.breeds.listPublic({ regionCode: query.regionCode, species: query.species });
  }
}

/** Admin breed taxonomy management: list all, create, and edit breeds. */
@ApiTags('admin/breeds')
@ApiBearerAuth()
@Controller('admin/breeds')
@Roles('super_admin')
export class AdminBreedsController {
  constructor(private readonly breeds: BreedsService) {}

  @Get()
  @ApiOperation({ summary: 'List all breeds including inactive (admin)' })
  @ApiResponse({ status: 200, type: [BreedDto] })
  @ApiResponse({ status: 403, description: 'Caller lacks the super_admin role' })
  listAll(): Promise<Breed[]> {
    return this.breeds.listAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single breed by id (admin)' })
  @ApiResponse({ status: 200, type: BreedDto })
  @ApiResponse({ status: 404, description: 'Breed not found' })
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<Breed> {
    return this.breeds.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a breed (admin); emits an audit event' })
  @ApiResponse({ status: 201, type: BreedDto })
  @ApiResponse({ status: 409, description: 'Breed already exists for the species and region' })
  create(
    @Body() dto: CreateBreedDto,
    @Req() request: { user?: AuthenticatedUser },
  ): Promise<Breed> {
    const actorId = request.user?.id ?? 'unknown';
    return this.breeds.create(dto, actorId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a breed (admin); emits an audit event' })
  @ApiResponse({ status: 200, type: BreedDto })
  @ApiResponse({ status: 404, description: 'Breed not found' })
  @ApiResponse({ status: 409, description: 'Renaming collides with an existing breed' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBreedDto,
    @Req() request: { user?: AuthenticatedUser },
  ): Promise<Breed> {
    const actorId = request.user?.id ?? 'unknown';
    return this.breeds.update(id, dto, actorId);
  }
}
