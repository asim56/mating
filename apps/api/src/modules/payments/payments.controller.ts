import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { CreatePaymentIntentDto, ListIntentsQueryDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

function toIntentResponse(intent: Awaited<ReturnType<PaymentsService['getIntent']>>) {
  return {
    id: intent.id,
    status: intent.status,
    purpose: intent.purpose,
    amount: intent.amount,
    currencyCode: intent.currencyCode,
    provider: intent.provider,
    providerReference: intent.providerReference,
    checkoutUrl: intent.metadata.checkoutUrl as string | undefined,
    proofUploaded: intent.proofUploaded,
  };
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('intents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment intent' })
  async createIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const intent = await this.payments.createIntent(dto, request.user!);
    return toIntentResponse({ ...intent, proofUploaded: false });
  }

  @Get('intents')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List own payment intents' })
  async listIntents(
    @Query() query: ListIntentsQueryDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const page = await this.payments.listIntents(request.user!, query);
    return {
      data: page.data.map((i) => toIntentResponse({ ...i, proofUploaded: Boolean(i.metadata.proofPath) })),
      meta: page.meta,
    };
  }

  @Get('intents/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment intent' })
  async getIntent(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return toIntentResponse(await this.payments.getIntent(id, request.user!));
  }
}
