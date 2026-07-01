import { Inject, Injectable } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';

import { BreedingRequestStateMachine } from '@mating/shared';

import { ApiError, ERROR_CODES, type AuthenticatedUser } from '../../../common';
import { AUDIT_EMITTER } from '../../audit/audit.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from '../../breeding-requests/breeding-requests.repository';
import {
  breedingRequestStatusChangedEvent,
  type BreedingAuditEvent,
} from '../../breeding-requests/events/breeding-request.events';
import { BreedingNotificationProducer } from '../../notifications/producers/breeding-notification.producer';
import type { PaymentIntent } from '../entities/payment.entity';

@Injectable()
export class PaymentConfirmedHandler {
  constructor(
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breedingRepo: InMemoryBreedingRequestsRepository,
    @Inject(AUDIT_EMITTER) private readonly audit: { emit(event: BreedingAuditEvent): Promise<void> },
    private readonly notifications: BreedingNotificationProducer,
  ) {}

  async onPaymentConfirmed(intent: PaymentIntent): Promise<void> {
    if (!intent.requestId) return;

    const request = await this.breedingRepo.findById(intent.requestId);
    if (!request || request.status !== 'PaymentPending') return;

    const toStatus = BreedingRequestStateMachine.assertTransition(request.status, 'schedule');
    const updated = await this.breedingRepo.updateStatus(request.id, toStatus, {
      scheduledAt: new Date().toISOString(),
      metadata: { paymentIntentId: intent.id, paymentConfirmedAt: new Date().toISOString() },
    });
    if (!updated) return;

    await this.breedingRepo.insertEvent({
      requestId: request.id,
      actorId: intent.payerId,
      eventType: 'status_changed',
      fromStatus: request.status,
      toStatus,
      metadata: { paymentIntentId: intent.id },
    });

    await this.audit.emit(
      breedingRequestStatusChangedEvent(intent.payerId, request.id, request.status, toStatus, {
        paymentIntentId: intent.id,
      }),
    );
    await this.notifications.onStatusChanged(updated, request.status, toStatus);
  }
}
