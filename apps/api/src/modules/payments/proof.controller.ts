import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import type { AuthenticatedUser } from '../../common';
import { AttachProofDto, ProofUploadUrlDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments/intents/:id/proof')
export class ProofController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('upload-url')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mint signed upload URL for bank-transfer proof' })
  async uploadUrl(
    @Param('id') id: string,
    @Body() dto: ProofUploadUrlDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.payments.createProofUploadUrl(id, request.user!, dto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Attach uploaded proof path' })
  async attach(
    @Param('id') id: string,
    @Body() dto: AttachProofDto,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    const updated = await this.payments.attachProof(id, request.user!, dto.storagePath);
    return { id: updated!.id, status: updated!.status };
  }
}

@ApiTags('payments')
@Controller('payments/intents/:id/proof')
export class AdminProofController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('admin-read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin fetch signed read URL for proof' })
  async adminRead(
    @Param('id') id: string,
    @Req() request: { user?: AuthenticatedUser },
  ) {
    return this.payments.getProofReadUrl(id, request.user!);
  }
}
