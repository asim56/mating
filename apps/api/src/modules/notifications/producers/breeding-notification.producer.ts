import { Injectable } from '@nestjs/common';

import type { BreedingRequestStatus } from '@mating/shared';

import { OutboxRepository } from '../outbox.repository';
import type { BreedingRequest } from '../../breeding-requests/entities/breeding-request.entity';

const TEMPLATE_BY_STATUS: Partial<Record<BreedingRequestStatus, string>> = {
  Requested: 'breeding.request_received',
  Accepted: 'breeding.request_accepted',
  Rejected: 'breeding.request_rejected',
  Scheduled: 'breeding.scheduled',
  Completed: 'breeding.completed',
  Disputed: 'breeding.disputed',
};

@Injectable()
export class BreedingNotificationProducer {
  constructor(private readonly outbox: OutboxRepository) {}

  async onStatusChanged(
    request: BreedingRequest,
    _from: BreedingRequestStatus | null,
    to: BreedingRequestStatus,
  ): Promise<void> {
    const templateKey = TEMPLATE_BY_STATUS[to];
    if (!templateKey) return;

    const recipientId = to === 'Requested' ? request.recipientId : request.requesterId;
    await this.outbox.enqueue({
      aggregateType: 'breeding_request',
      aggregateId: request.id,
      eventType: templateKey,
      payload: {
        templateKey,
        category: 'transactional',
        locale: 'en',
        recipientId,
        requestId: request.id,
        status: to,
      },
      idempotencyKey: `${request.id}:${to}:${templateKey}`,
    });
  }
}
