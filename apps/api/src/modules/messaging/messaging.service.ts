import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../common';
import { AUDIT_EMITTER } from '../audit/audit.service';
import {
  BREEDING_REQUESTS_REPOSITORY,
  InMemoryBreedingRequestsRepository,
} from '../breeding-requests/breeding-requests.repository';
import {
  MARKETPLACE_REPOSITORY,
  InMemoryMarketplaceRepository,
} from '../marketplace/marketplace.repository';
import {
  InMemoryMessagingRepository,
  MESSAGING_REPOSITORY,
  type ConversationRow,
  type MessageRow,
} from './messaging.repository';
import { PhoneMaskService } from './phone-mask.service';

@Injectable()
export class MessagingService {
  constructor(
    @Inject(MESSAGING_REPOSITORY) private readonly repo: InMemoryMessagingRepository,
    @Inject(BREEDING_REQUESTS_REPOSITORY)
    private readonly breedingRequests: InMemoryBreedingRequestsRepository,
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: {
      emit(event: {
        action: string;
        actorId: string;
        subjectType: string;
        subjectId: string;
        metadata?: Record<string, unknown>;
      }): Promise<void>;
    },
    private readonly phoneMask: PhoneMaskService,
  ) {}

  async listConversations(user: AuthenticatedUser) {
    const rows = await this.repo.listConversationsForUser(user.id);
    const data = await Promise.all(
      rows.map(async (c) => {
        const participants = await this.repo.listParticipants(c.id);
        const messages = await this.repo.listMessages(c.id, { limit: 1 });
        return {
          id: c.id,
          requestId: c.requestId,
          listingId: c.listingId,
          status: c.status,
          lastMessageAt: messages[0]?.createdAt ?? c.createdAt,
          participants: participants.map((p) => ({
            userId: p.userId,
            displayName: p.displayName ?? 'User',
          })),
        };
      }),
    );
    return { data, meta: { nextCursor: null, hasMore: false } };
  }

  async createConversation(
    user: AuthenticatedUser,
    input: { listingId?: string; requestId?: string },
  ): Promise<ConversationRow> {
    if (!input.listingId && !input.requestId) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'listingId or requestId required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    let counterpartyId: string;
    let requestId = input.requestId ?? null;
    let listingId = input.listingId ?? null;

    if (requestId) {
      const request = await this.breedingRequests.findById(requestId);
      if (!request) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Request not found.', HttpStatus.NOT_FOUND);
      }
      counterpartyId =
        request.requesterId === user.id ? request.recipientId : request.requesterId;
      this.repo.setRequestStatusForConversation(requestId, request.status);
    } else if (listingId) {
      const listing = await this.listings.findById(listingId);
      if (!listing) {
        throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
      }
      counterpartyId = listing.ownerId;
    } else {
      throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid context.', HttpStatus.BAD_REQUEST);
    }

    const existing = await this.repo.findConversationByContext({
      requestId,
      listingId,
      userIds: [user.id, counterpartyId],
    });
    if (existing) return existing;

    const role =
      requestId &&
      (await this.breedingRequests.findById(requestId))?.requesterId === user.id
        ? 'requester'
        : 'recipient';

    return this.repo.createConversation({
      requestId,
      listingId,
      participants: [
        { userId: user.id, role: role as 'requester' | 'recipient' },
        {
          userId: counterpartyId,
          role: role === 'requester' ? 'recipient' : 'requester',
        },
      ],
    });
  }

  async listMessages(
    conversationId: string,
    user: AuthenticatedUser,
    query: { cursor?: string; limit?: number },
  ) {
    await this.assertParticipant(conversationId, user);
    const conv = await this.repo.findConversationById(conversationId);
    const requestStatus = await this.resolveRequestStatus(conv);
    const limit = clampLimit(query.limit ?? 50);
    const rows = await this.repo.listMessages(conversationId, {
      cursor: query.cursor,
      limit,
    });
    const page = buildPage(rows, limit, (m) => m.createdAt);
    return {
      data: page.data.map((m) => this.toMessageResponse(m, requestStatus)),
      meta: page.meta,
    };
  }

  async sendMessage(
    conversationId: string,
    user: AuthenticatedUser,
    input: { body?: string; attachmentPath?: string },
  ) {
    await this.assertParticipant(conversationId, user);
    const conv = await this.requireConversation(conversationId);
    if (conv.status === 'frozen') {
      throw new ApiError(
        ERROR_CODES.FORBIDDEN,
        'Conversation is frozen.',
        HttpStatus.FORBIDDEN,
      );
    }
    if (!input.body?.trim() && !input.attachmentPath) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'Message body or attachment required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const requestStatus = await this.resolveRequestStatus(conv);
    const { body } = this.phoneMask.prepareBody(input.body ?? null, requestStatus);

    const created = await this.repo.insertMessage({
      conversationId,
      senderId: user.id,
      body,
      attachmentPath: input.attachmentPath,
    });

    return this.toMessageResponse(created, requestStatus);
  }

  async reportMessage(messageId: string, user: AuthenticatedUser) {
    const message = await this.repo.findMessageById(messageId);
    if (!message) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Message not found.', HttpStatus.NOT_FOUND);
    }
    await this.assertParticipant(message.conversationId, user);
    const updated = await this.repo.reportMessage(messageId);
    await this.audit.emit({
      action: 'message.reported',
      actorId: user.id,
      subjectType: 'message',
      subjectId: messageId,
    });
    const conv = await this.repo.findConversationById(message.conversationId);
    const requestStatus = await this.resolveRequestStatus(conv);
    return {
      reported: true,
      message: updated ? this.toMessageResponse(updated, requestStatus) : null,
    };
  }

  async freezeConversation(conversationId: string): Promise<ConversationRow> {
    const frozen = await this.repo.freezeConversation(conversationId);
    if (!frozen) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Conversation not found.', HttpStatus.NOT_FOUND);
    }
    await this.audit.emit({
      action: 'conversation.frozen',
      actorId: 'system',
      subjectType: 'conversation',
      subjectId: conversationId,
    });
    return frozen;
  }

  async freezeConversationsForRequest(requestId: string): Promise<void> {
    const convs = await this.repo.listByRequestId(requestId);
    for (const c of convs) {
      await this.freezeConversation(c.id);
    }
  }

  private toMessageResponse(
    message: MessageRow,
    requestStatus: import('@mating/shared').BreedingRequestStatus | null,
  ) {
    const revealed = this.phoneMask.shouldReveal(requestStatus);
    return {
      id: message.id,
      senderId: message.senderId,
      body: message.body,
      attachment: message.attachmentPath
        ? { path: message.attachmentPath, readUrl: 'signed', expiresAt: null }
        : null,
      phoneRevealed: revealed && !message.body?.includes('[phone hidden]'),
      createdAt: message.createdAt,
    };
  }

  private async resolveRequestStatus(
    conv: ConversationRow | null,
  ): Promise<import('@mating/shared').BreedingRequestStatus | null> {
    if (!conv?.requestId) return null;
    const request = await this.breedingRequests.findById(conv.requestId);
    return request?.status ?? this.repo.getRequestStatus(conv.requestId);
  }

  private async requireConversation(id: string): Promise<ConversationRow> {
    const conv = await this.repo.findConversationById(id);
    if (!conv) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Conversation not found.', HttpStatus.NOT_FOUND);
    }
    return conv;
  }

  private async assertParticipant(conversationId: string, user: AuthenticatedUser): Promise<void> {
    const isSupport = user.roles.some((r) => r === 'support_agent' || r === 'super_admin');
    if (isSupport) return;
    const ok = await this.repo.isParticipant(conversationId, user.id);
    if (!ok) {
      throw new ApiError(ERROR_CODES.FORBIDDEN, 'Not a participant.', HttpStatus.FORBIDDEN);
    }
  }
}
