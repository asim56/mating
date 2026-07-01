import { forwardRef, HttpStatus, Inject, Injectable } from '@nestjs/common';

import type { RefundReasonCode } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../../common';
import { AdminPaymentsService } from '../../wallet-ledger/admin-payments.service';

/** Triggers M5 refund on dispute resolution (FR-004). */
@Injectable()
export class DisputeRefundService {
  constructor(
    @Inject(forwardRef(() => AdminPaymentsService))
    private readonly adminPayments: AdminPaymentsService,
  ) {}

  async triggerRefund(
    paymentIntentId: string,
    admin: AuthenticatedUser,
    options: { amount?: number; notes?: string },
  ): Promise<void> {
    try {
      await this.adminPayments.refund(paymentIntentId, admin, {
        reasonCode: 'dispute_resolution' as RefundReasonCode,
        amount: options.amount,
        notes: options.notes,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        throw new ApiError(
          ERROR_CODES.CONFLICT,
          'Refund failed during dispute resolution.',
          HttpStatus.CONFLICT,
          { cause: err.code },
        );
      }
      throw err;
    }
  }
}
