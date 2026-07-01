import { Body, Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common';
import type { PaymentProviderCode } from '@mating/shared';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class WebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':provider/webhook')
  @Public()
  @ApiOperation({ summary: 'Process provider payment webhook' })
  async webhook(
    @Param('provider') provider: PaymentProviderCode,
    @Body() body: Record<string, unknown>,
    @Headers('x-payment-signature') signature: string,
    @Req() request: { rawBody?: string },
  ) {
    const rawBody = request.rawBody ?? JSON.stringify(body);
    return this.payments.processWebhook(provider, rawBody, signature ?? '');
  }
}
