import { HttpStatus, Injectable } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common';
import { ApiError, ERROR_CODES } from '../../common';
import { buildPage, clampLimit } from '../../common/pagination/cursor';
import { SessionsRepository, type SessionRow } from './sessions.repository';

export type SessionView = {
  id: string;
  deviceDescriptor: string | null;
  ip: string | null;
  lastSeenAt: string;
  createdAt: string;
  current: boolean;
};

@Injectable()
export class SessionsService {
  constructor(private readonly sessions: SessionsRepository) {}

  async list(
    accountId: string,
    currentSessionId: string | undefined,
    cursor?: string,
    limit?: number,
  ): Promise<{ data: SessionView[]; meta: { nextCursor: string | null; hasMore: boolean } }> {
    const take = clampLimit(limit);
    const rows = await this.sessions.listActive(accountId, cursor, take + 1);
    const page = buildPage(rows, take, (row) => row.created_at);
    return {
      data: page.data.map((row) => this.toView(row, currentSessionId)),
      meta: page.meta,
    };
  }

  async revoke(
    accountId: string,
    input: { sessionId?: string; all?: boolean },
  ): Promise<{ revoked: number }> {
    if (input.all) {
      return { revoked: await this.sessions.revokeAll(accountId) };
    }
    if (!input.sessionId) {
      throw new ApiError(
        ERROR_CODES.VALIDATION_FAILED,
        'sessionId or all is required.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const revoked = await this.sessions.revokeOne(accountId, input.sessionId);
    if (!revoked) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Session not found.', HttpStatus.NOT_FOUND);
    }
    return { revoked: 1 };
  }

  async logout(user: AuthenticatedUser): Promise<{ status: 'logged_out' }> {
    const sessionId = user.sessionId as string | undefined;
    if (sessionId) {
      await this.sessions.revokeOne(user.id, sessionId);
    }
    return { status: 'logged_out' };
  }

  private toView(row: SessionRow, currentSessionId?: string): SessionView {
    return {
      id: row.id,
      deviceDescriptor: row.device_descriptor,
      ip: row.ip,
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      current: row.id === currentSessionId,
    };
  }
}
