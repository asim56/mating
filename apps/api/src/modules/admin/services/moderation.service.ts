import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, buildPage, clampLimit, type AuthenticatedUser } from '../../../common';
import { AUDIT_EMITTER } from '../../audit/audit.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../../animals/animals.repository';
import {
  MARKETPLACE_REPOSITORY,
  type InMemoryMarketplaceRepository,
} from '../../marketplace/marketplace.repository';
import type {
  ApproveCategoryDto,
  ReportMessageDto,
  SuspendAnimalDto,
  SuspendListingDto,
  UnsuspendDto,
} from '../dto/moderation.dto';
import { AdminRoleGuardService } from '../guards/admin-role.guard';

export type ModerationAuditEvent = {
  action: string;
  actorId: string;
  subjectType: string;
  subjectId: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ModerationService {
  private readonly reportedMessages = new Map<
    string,
    { reportId: string; messageId: string; status: string; reasonCode: string }
  >();
  private readonly frozenConversations = new Set<string>();
  private readonly adminRoles = new AdminRoleGuardService();

  constructor(
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    @Inject(AUDIT_EMITTER)
    private readonly audit: { emit(event: ModerationAuditEvent): Promise<void> },
  ) {}

  async suspendListing(id: string, admin: AuthenticatedUser, dto: SuspendListingDto) {
    this.adminRoles.assertModerationAccess(admin);
    const listing = await this.listings.findById(id);
    if (!listing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    const updated = await this.listings.setStatus(id, 'suspended');
    await this.audit.emit({
      action: 'listing.suspended',
      actorId: admin.id,
      subjectType: 'listing',
      subjectId: id,
      metadata: { reasonCode: dto.reasonCode, notes: dto.notes },
    });
    return { id, status: updated!.status };
  }

  async unsuspendListing(id: string, admin: AuthenticatedUser, _dto: UnsuspendDto) {
    this.adminRoles.assertModerationAccess(admin);
    const listing = await this.listings.findById(id);
    if (!listing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    const updated = await this.listings.setStatus(id, 'active');
    return { id, status: updated!.status };
  }

  async approveCategory(id: string, admin: AuthenticatedUser, dto: ApproveCategoryDto) {
    this.adminRoles.assertSuperAdmin(admin);
    const listing = await this.listings.findById(id);
    if (!listing) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Listing not found.', HttpStatus.NOT_FOUND);
    }
    const updated = await this.listings.update(id, {
      availability: {
        ...listing.availability,
        category_approved: dto.approved,
      },
    });
    return { id, metadata: { category_approved: dto.approved }, status: updated!.status };
  }

  async suspendAnimal(id: string, admin: AuthenticatedUser, dto: SuspendAnimalDto) {
    this.adminRoles.assertModerationAccess(admin);
    const animal = await this.animals.findById(id);
    if (!animal) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    const updated = await this.animals.update(id, { healthStatus: 'blocked' });
    await this.audit.emit({
      action: 'animal.suspended',
      actorId: admin.id,
      subjectType: 'animal',
      subjectId: id,
      metadata: { reasonCode: dto.reasonCode, notes: dto.notes },
    });
    return { id, healthStatus: updated!.healthStatus };
  }

  async unsuspendAnimal(id: string, admin: AuthenticatedUser, _dto: UnsuspendDto) {
    this.adminRoles.assertModerationAccess(admin);
    const animal = await this.animals.findById(id);
    if (!animal) {
      throw new ApiError(ERROR_CODES.NOT_FOUND, 'Animal not found.', HttpStatus.NOT_FOUND);
    }
    const updated = await this.animals.update(id, { healthStatus: 'healthy' });
    return { id, healthStatus: updated!.healthStatus };
  }

  async reportMessage(messageId: string, user: AuthenticatedUser, dto: ReportMessageDto) {
    const reportId = `report-${messageId}`;
    this.reportedMessages.set(messageId, {
      reportId,
      messageId,
      status: 'open',
      reasonCode: dto.reasonCode,
    });
    await this.audit.emit({
      action: 'message.reported',
      actorId: user.id,
      subjectType: 'message',
      subjectId: messageId,
      metadata: { reasonCode: dto.reasonCode, notes: dto.notes },
    });
    return { reportId, messageId, status: 'open' };
  }

  async freezeConversation(id: string, admin: AuthenticatedUser) {
    this.adminRoles.assertModerationAccess(admin);
    this.frozenConversations.add(id);
    await this.audit.emit({
      action: 'message.frozen',
      actorId: admin.id,
      subjectType: 'conversation',
      subjectId: id,
    });
    return { id, status: 'frozen' };
  }

  async moderationQueue(query: { type?: string; cursor?: string; limit?: number }) {
    const limit = clampLimit(query.limit);
    const items: Array<Record<string, unknown>> = [];

    if (!query.type || query.type === 'listing') {
      const suspended = await this.listings.listSuspended();
      for (const l of suspended) {
        items.push({ type: 'listing', id: l.id, status: l.status });
      }
    }
    for (const [, report] of this.reportedMessages) {
      if (!query.type || query.type === 'message') {
        items.push({ type: 'message', ...report });
      }
    }

    return buildPage(items, limit, () => new Date().toISOString());
  }
}
