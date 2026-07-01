import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

import type { PaymentProviderCode, PaymentPurpose } from '@mating/shared';

export class CreatePaymentIntentDto {
  @IsEnum(['deposit', 'full_fee', 'boost', 'subscription'])
  purpose!: PaymentPurpose;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @MinLength(3)
  currencyCode!: string;

  @IsEnum(['bank_transfer', 'easypaisa', 'jazzcash', 'stripe'])
  provider!: PaymentProviderCode;

  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @IsUUID()
  payeeId?: string;

  @IsOptional()
  @IsUUID()
  boostOrderId?: string;

  @IsOptional()
  @IsUUID()
  subscriptionPlanId?: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

export class ProofUploadUrlDto {
  @IsEnum(['image/jpeg', 'image/png', 'application/pdf'])
  contentType!: 'image/jpeg' | 'image/png' | 'application/pdf';

  @IsString()
  @MinLength(1)
  filename!: string;
}

export class AttachProofDto {
  @IsString()
  @MinLength(1)
  storagePath!: string;
}

export class ListIntentsQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class ReconcilePaymentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundPaymentDto {
  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
