import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { BreedingRequestStatus } from '@mating/shared';

import { decodeCursor } from '../../common';

export type ConversationRow = {
  id: string;
  requestId: string | null;
  listingId: string | null;
  status: 'active' | 'frozen' | 'archived';
  createdAt: string;
};

export type ParticipantRow = {
  conversationId: string;
  userId: string;
  role: 'requester' | 'recipient' | 'support';
  joinedAt: string;
  displayName: string | null;
};

export type MessageRow = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  attachmentPath: string | null;
  moderationStatus: 'clean' | 'reported' | 'hidden';
  createdAt: string;
  deletedAt: string | null;
};

export const MESSAGING_REPOSITORY = 'MESSAGING_REPOSITORY';

@Injectable()
export class InMemoryMessagingRepository {
  private readonly conversations = new Map<string, ConversationRow>();
  private readonly participants = new Map<string, ParticipantRow[]>();
  private readonly messages = new Map<string, MessageRow[]>();

  async findConversationByContext(input: {
    requestId?: string | null;
    listingId?: string | null;
    userIds: [string, string];
  }): Promise<ConversationRow | null> {
    for (const conv of this.conversations.values()) {
      if (input.requestId && conv.requestId !== input.requestId) continue;
      if (input.listingId && conv.listingId !== input.listingId) continue;
      const parts = this.participants.get(conv.id) ?? [];
      const ids = new Set(parts.map((p) => p.userId));
      if (ids.has(input.userIds[0]) && ids.has(input.userIds[1])) {
        return { ...conv };
      }
    }
    return null;
  }

  async createConversation(input: {
    requestId?: string | null;
    listingId?: string | null;
    participants: Array<{ userId: string; role: ParticipantRow['role']; displayName?: string }>;
  }): Promise<ConversationRow> {
    const now = new Date().toISOString();
    const conv: ConversationRow = {
      id: randomUUID(),
      requestId: input.requestId ?? null,
      listingId: input.listingId ?? null,
      status: 'active',
      createdAt: now,
    };
    this.conversations.set(conv.id, conv);
    this.participants.set(
      conv.id,
      input.participants.map((p) => ({
        conversationId: conv.id,
        userId: p.userId,
        role: p.role,
        joinedAt: now,
        displayName: p.displayName ?? null,
      })),
    );
    this.messages.set(conv.id, []);
    return { ...conv };
  }

  async listConversationsForUser(userId: string): Promise<ConversationRow[]> {
    return [...this.conversations.values()].filter((c) =>
      (this.participants.get(c.id) ?? []).some((p) => p.userId === userId),
    );
  }

  async listByRequestId(requestId: string): Promise<ConversationRow[]> {
    return [...this.conversations.values()].filter((c) => c.requestId === requestId);
  }

  async findConversationById(id: string): Promise<ConversationRow | null> {
    const row = this.conversations.get(id);
    return row ? { ...row } : null;
  }

  async listParticipants(conversationId: string): Promise<ParticipantRow[]> {
    return [...(this.participants.get(conversationId) ?? [])];
  }

  async isParticipant(conversationId: string, userId: string): Promise<boolean> {
    return (this.participants.get(conversationId) ?? []).some((p) => p.userId === userId);
  }

  async insertMessage(input: {
    conversationId: string;
    senderId: string;
    body: string | null;
    attachmentPath?: string | null;
  }): Promise<MessageRow> {
    const msg: MessageRow = {
      id: randomUUID(),
      conversationId: input.conversationId,
      senderId: input.senderId,
      body: input.body,
      attachmentPath: input.attachmentPath ?? null,
      moderationStatus: 'clean',
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };
    const list = this.messages.get(input.conversationId) ?? [];
    list.push(msg);
    this.messages.set(input.conversationId, list);
    return { ...msg };
  }

  async listMessages(
    conversationId: string,
    filter: { cursor?: string; limit: number },
  ): Promise<MessageRow[]> {
    let rows = [...(this.messages.get(conversationId) ?? [])].filter((m) => !m.deletedAt);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((m) => m.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1);
  }

  async findMessageById(id: string): Promise<MessageRow | null> {
    for (const list of this.messages.values()) {
      const match = list.find((m) => m.id === id);
      if (match) return { ...match };
    }
    return null;
  }

  async reportMessage(id: string): Promise<MessageRow | null> {
    for (const [convId, list] of this.messages.entries()) {
      const idx = list.findIndex((m) => m.id === id);
      if (idx >= 0) {
        const current = list[idx]!;
        const updated: MessageRow = { ...current, moderationStatus: 'reported' };
        list[idx] = updated;
        this.messages.set(convId, list);
        return { ...updated };
      }
    }
    return null;
  }

  async freezeConversation(id: string): Promise<ConversationRow | null> {
    const conv = this.conversations.get(id);
    if (!conv) return null;
    const updated = { ...conv, status: 'frozen' as const };
    this.conversations.set(id, updated);
    return { ...updated };
  }

  /** Test helper: link request status for masking policy. */
  private requestStatuses = new Map<string, BreedingRequestStatus | null>();

  setRequestStatusForConversation(requestId: string, status: BreedingRequestStatus | null): void {
    this.requestStatuses.set(requestId, status);
  }

  getRequestStatus(requestId: string | null): BreedingRequestStatus | null {
    if (!requestId) return null;
    return this.requestStatuses.get(requestId) ?? null;
  }
}
