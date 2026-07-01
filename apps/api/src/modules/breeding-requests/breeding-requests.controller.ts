import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { BreedingRecordsService } from './breeding-records.service';
import { BreedingRequestsService } from './breeding-requests.service';
import { DisputesService } from './disputes.service';
import { MessagingService } from '../messaging/messaging.service';
import {
  toBreedingRecordResponse,
  toBreedingRequestDetailResponse,
  toBreedingRequestResponse,
} from './dto/breeding-request-response.dto';
import {
  CreateBreedingRequestDto,
  ListBreedingRequestsQueryDto,
  OpenDisputeDto,
  RejectBreedingRequestDto,
  ScheduleBreedingRequestDto,
} from './dto/create-breeding-request.dto';

@ApiTags('breeding-requests')
@Controller('breeding-requests')
export class BreedingRequestsController {
  constructor(
    private readonly service: BreedingRequestsService,
    private readonly records: BreedingRecordsService,
    private readonly disputes: DisputesService,
    private readonly messaging: MessagingService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create breeding request' })
  async create(
    @Body() dto: CreateBreedingRequestDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const created = await this.service.create(dto, request.user!);
    return toBreedingRequestResponse(created);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List breeding requests' })
  async list(
    @Query() query: ListBreedingRequestsQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const page = await this.service.list(request.user!, query);
    return {
      data: page.data.map(toBreedingRequestResponse),
      meta: page.meta,
    };
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get breeding request with events' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const { request: row, events } = await this.service.getById(id, request.user!);
    return toBreedingRequestDetailResponse(row, events);
  }

  @Post(':id/accept')
  @ApiBearerAuth()
  async accept(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(await this.service.accept(id, request.user!));
  }

  @Post(':id/reject')
  @ApiBearerAuth()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectBreedingRequestDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(
      await this.service.reject(id, request.user!, dto.reason),
    );
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(await this.service.cancel(id, request.user!));
  }

  @Post(':id/schedule')
  @ApiBearerAuth()
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleBreedingRequestDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(
      await this.service.schedule(id, request.user!, dto),
    );
  }

  @Post(':id/start')
  @ApiBearerAuth()
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(await this.service.start(id, request.user!));
  }

  @Post(':id/complete')
  @ApiBearerAuth()
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(await this.service.complete(id, request.user!));
  }

  @Post(':id/record')
  @ApiBearerAuth()
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  async record(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const result = await this.service.generateRecord(id, request.user!, idempotencyKey);
    return {
      breedingRecord: toBreedingRecordResponse(result.record),
      request: toBreedingRequestResponse(result.request),
      created: result.created,
    };
  }

  @Post(':id/close')
  @ApiBearerAuth()
  async close(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toBreedingRequestResponse(await this.service.close(id, request.user!));
  }

  @Post(':id/dispute')
  @ApiBearerAuth()
  async openDispute(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OpenDisputeDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const { dispute, request: row } = await this.disputes.openDispute(id, dto, request.user!);
    await this.messaging.freezeConversationsForRequest(id);
    return {
      dispute,
      requestStatus: row.status,
    };
  }
}

@ApiTags('disputes')
@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispute detail' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.disputes.getById(id, request.user!);
  }
}
