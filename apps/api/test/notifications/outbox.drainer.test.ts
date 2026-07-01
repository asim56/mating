import assert from 'node:assert/strict';
import test from 'node:test';

import { OutboxDrainer } from '../../src/modules/notifications/outbox.drainer';
import type { OutboxRepository } from '../../src/modules/notifications/outbox.repository';

class MemoryOutbox implements Pick<OutboxRepository, 'listPending' | 'markDelivered' | 'enqueue'> {
  private rows: { id: string; event_type: string; payload: Record<string, unknown> }[] = [];
  private delivered = new Set<string>();

  async enqueue(message: {
    idempotencyKey: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<{ inserted: boolean }> {
    if (this.rows.some((r) => r.id === message.idempotencyKey)) {
      return { inserted: false };
    }
    this.rows.push({
      id: message.idempotencyKey,
      event_type: message.eventType,
      payload: message.payload,
    });
    return { inserted: true };
  }

  async listPending(): Promise<{ id: string; event_type: string; payload: Record<string, unknown> }[]> {
    return this.rows.filter((r) => !this.delivered.has(r.id));
  }

  async markDelivered(id: string): Promise<void> {
    this.delivered.add(id);
  }
}

test('OutboxDrainer drains pending rows once', async () => {
  const repo = new MemoryOutbox();
  await repo.enqueue({
    aggregateType: 'account',
    aggregateId: 'a1',
    eventType: 'welcome',
    payload: {},
    idempotencyKey: 'key-1',
  });

  const drainer = new OutboxDrainer(repo as unknown as OutboxRepository);
  assert.equal(await drainer.drainOnce(), 1);
  assert.equal(await drainer.drainOnce(), 0);
});

test('duplicate idempotency key is ignored', async () => {
  const repo = new MemoryOutbox();
  const msg = {
    aggregateType: 'account',
    aggregateId: 'a1',
    eventType: 'welcome',
    payload: {},
    idempotencyKey: 'dup',
  };
  assert.deepEqual(await repo.enqueue(msg), { inserted: true });
  assert.deepEqual(await repo.enqueue(msg), { inserted: false });
});
