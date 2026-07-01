import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { VERIFICATION_DIMENSIONS } from '@mating/shared';

import type { AuthenticatedUser } from '../../common';
import { VerificationQueueService } from './verification-queue.service';

class SubmitVerificationDto {
  @IsEnum(['animal', 'profile', 'facility'])
  subjectType!: 'animal' | 'profile' | 'facility';

  @IsUUID()
  subjectId!: string;

  @IsEnum(VERIFICATION_DIMENSIONS)
  dimension!: (typeof VERIFICATION_DIMENSIONS)[number];

  @IsOptional()
  checklist?: Record<string, unknown>;
}

@ApiTags('verification')
@Controller('verifications')
export class VerificationsController {
  constructor(private readonly verifications: VerificationQueueService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit verification request' })
  async submit(
    @Body() dto: SubmitVerificationDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.verifications.submit(dto, request.user!);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List caller verification requests' })
  async listMine(
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: number | undefined,
    @Query('status') status: string | undefined,
    @Query('dimension') dimension: string | undefined,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.verifications.listMine(request.user!, { cursor, limit, status, dimension });
  }
}
