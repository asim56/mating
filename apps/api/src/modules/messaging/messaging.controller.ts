import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles, type AuthenticatedUser } from '../../common';
import { MessagingService } from './messaging.service';

class CreateConversationDto {
  listingId?: string;
  requestId?: string;
}

class SendMessageDto {
  body?: string;
  attachmentPath?: string;
}

class ReportMessageDto {
  reasonCode!: string;
  description?: string;
}

class ListMessagesQueryDto {
  cursor?: string;
  limit?: number;
}

@ApiTags('messaging')
@Controller('conversations')
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List conversations' })
  async list(@Req() request: { user?: AuthenticatedUser }) {
    return this.messaging.listConversations(request.user!);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create conversation' })
  async create(
    @Body() dto: CreateConversationDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.messaging.createConversation(request.user!, dto);
  }

  @Get(':id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List messages' })
  async listMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListMessagesQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.messaging.listMessages(id, request.user!, query);
  }

  @Post(':id/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send message' })
  async send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.messaging.sendMessage(id, request.user!, dto);
  }
}

@ApiTags('messaging')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Post(':id/report')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report message' })
  async report(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: ReportMessageDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.messaging.reportMessage(id, request.user!);
  }
}

@ApiTags('admin')
@Controller('admin/conversations')
export class AdminConversationsController {
  constructor(private readonly messaging: MessagingService) {}

  @Post(':id/freeze')
  @ApiBearerAuth()
  @Roles('support_agent', 'super_admin')
  @ApiOperation({ summary: 'Freeze conversation' })
  async freeze(@Param('id', ParseUUIDPipe) id: string) {
    return this.messaging.freezeConversation(id);
  }
}
