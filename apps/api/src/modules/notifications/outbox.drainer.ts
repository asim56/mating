import { Injectable } from '@nestjs/common';

import { OutboxRepository } from './outbox.repository';

/** Stub drainer: marks pending outbox rows delivered without external dispatch. */
@Injectable()
export class OutboxDrainer {
  constructor(private readonly outbox: OutboxRepository) {}

  async drainOnce(): Promise<number> {
    const pending = await this.outbox.listPending();
    for (const row of pending) {
      await this.outbox.markDelivered(row.id);
    }
    return pending.length;
  }
}
