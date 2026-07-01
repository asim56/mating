import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

import type { AuthenticatedUser } from '../../common';
import { AddEmailDto } from './dto/email-auth.dto';
import { IdentityService } from './identity.service';
import { SessionsService } from './sessions.service';

class RevokeSessionsDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsBoolean()
  all?: boolean;
}

class ListSessionsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(
    private readonly identity: IdentityService,
    private readonly sessions: SessionsService,
  ) {}

  @Post('email')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Add email to phone-first account' })
  addEmail(@Req() req: { user?: AuthenticatedUser }, @Body() dto: AddEmailDto) {
    return this.identity.addEmailToAccount(req.user!.id, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List active sessions' })
  listSessions(@Req() req: { user?: AuthenticatedUser }, @Query() query: ListSessionsQueryDto) {
    return this.sessions.list(
      req.user!.id,
      req.user!.sessionId as string | undefined,
      query.cursor,
      query.limit,
    );
  }

  @Post('sessions/revoke')
  @ApiOperation({ summary: 'Revoke one or all sessions' })
  revokeSessions(@Req() req: { user?: AuthenticatedUser }, @Body() dto: RevokeSessionsDto) {
    return this.sessions.revoke(req.user!.id, dto);
  }
}
