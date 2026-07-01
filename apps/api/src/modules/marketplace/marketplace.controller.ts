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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public, type AuthenticatedUser } from '../../common';
import { CreateListingDto, UpdateListingDto } from './dto/create-listing.dto';
import { ListMineQueryDto } from './dto/list-mine-query.dto';
import { toListingResponse } from './dto/listing-response.dto';
import { SaveListingDto } from './dto/save-listing.dto';
import { MarketplaceService, SavedListingsService } from './marketplace.service';

@ApiTags('marketplace')
@Controller('listings')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create draft listing' })
  async create(
    @Body() dto: CreateListingDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const listing = await this.marketplace.create(dto, request.user!);
    return toListingResponse(listing);
  }

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own listings' })
  async listMine(
    @Query() query: ListMineQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const page = await this.marketplace.listMine(request.user!, query);
    return {
      data: page.data.map(toListingResponse),
      meta: page.meta,
    };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Public listing detail (no phone)' })
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.marketplace.getPublicDetail(id, request.user?.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own listing' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateListingDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const listing = await this.marketplace.update(id, dto, request.user!);
    return toListingResponse(listing);
  }

  @Post(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish listing to active' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const listing = await this.marketplace.publish(id, request.user!);
    return {
      status: listing.status,
      publishedAt: listing.publishedAt,
    };
  }

  @Post(':id/pause')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause listing' })
  async pause(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const listing = await this.marketplace.pause(id, request.user!);
    return { status: listing.status };
  }

  @Post(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish listing to draft' })
  async unpublish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const listing = await this.marketplace.unpublish(id, request.user!);
    return { status: listing.status };
  }
}

@ApiTags('saved-listings')
@ApiBearerAuth()
@Controller('saved-listings')
export class SavedListingsController {
  constructor(private readonly saved: SavedListingsService) {}

  @Get()
  @ApiOperation({ summary: 'List saved listings' })
  list(@Req() request: { user?: AuthenticatedUser }) {
    return this.saved.list(request.user!);
  }

  @Post()
  @ApiOperation({ summary: 'Save listing (idempotent)' })
  save(
    @Body() dto: SaveListingDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.saved.save(request.user!, dto.listingId);
  }

  @Delete(':listingId')
  @ApiOperation({ summary: 'Unsave listing (idempotent)' })
  async unsave(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    await this.saved.unsave(request.user!, listingId);
    return { removed: true };
  }
}
