import { Body, Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type AuthenticatedUser, JwtAuthGuard, Public, Roles, RolesGuard } from '../../common';
import { RegionDto, RegionPublicDto } from './dto/region-response.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import type { Region, RegionPublicView } from './entities/region.entity';
import { RegionsService } from './regions.service';

/** Public reference data: active regions with currency, locale, and payment methods. */
@ApiTags('regions')
@Controller('regions')
export class RegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active regions (public reference data)' })
  @ApiResponse({ status: 200, type: [RegionPublicDto] })
  list(): Promise<RegionPublicView[]> {
    return this.regions.listPublic();
  }
}

/** Admin region configuration: read full config and update mutable fields. */
@ApiTags('admin/regions')
@ApiBearerAuth()
@Controller('admin/regions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AdminRegionsController {
  constructor(private readonly regions: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'List all regions with full configuration (admin)' })
  @ApiResponse({ status: 200, type: [RegionDto] })
  @ApiResponse({ status: 403, description: 'Caller lacks the super_admin role' })
  listAll(): Promise<Region[]> {
    return this.regions.listAll();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get a single region by code (admin)' })
  @ApiResponse({ status: 200, type: RegionDto })
  @ApiResponse({ status: 404, description: 'Region not found' })
  getOne(@Param('code') code: string): Promise<Region> {
    return this.regions.getByCode(code);
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Update region configuration (admin); emits an audit event' })
  @ApiResponse({ status: 200, type: RegionDto })
  @ApiResponse({ status: 404, description: 'Region not found' })
  update(
    @Param('code') code: string,
    @Body() dto: UpdateRegionDto,
    @Req() request: { user?: AuthenticatedUser },
  ): Promise<Region> {
    const actorId = request.user?.id ?? 'unknown';
    return this.regions.update(code, dto, actorId);
  }
}
