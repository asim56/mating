import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { ReviewStatus } from '@mating/shared';

import { decodeCursor } from '../../common';

export type Review = {
  id: string;
  requestId: string;
  reviewerId: string;
  subjectUserId: string;
  subjectAnimalId: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: ReviewStatus;
  isDisputeInfluenced: boolean;
  moderatedBy: string | null;
  moderatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ReviewCreate = {
  requestId: string;
  reviewerId: string;
  subjectUserId: string;
  subjectAnimalId?: string | null;
  rating: number;
  title?: string | null;
  body?: string | null;
  status: ReviewStatus;
  isDisputeInfluenced?: boolean;
};

export const REVIEWS_REPOSITORY = 'REVIEWS_REPOSITORY';

@Injectable()
export class InMemoryReviewsRepository {
  private readonly reviews = new Map<string, Review>();

  async create(input: ReviewCreate): Promise<Review> {
    const duplicate = await this.findByRequestAndReviewer(input.requestId, input.reviewerId);
    if (duplicate) {
      throw new Error('DUPLICATE_REVIEW');
    }
    const now = new Date().toISOString();
    const row: Review = {
      id: randomUUID(),
      requestId: input.requestId,
      reviewerId: input.reviewerId,
      subjectUserId: input.subjectUserId,
      subjectAnimalId: input.subjectAnimalId ?? null,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body ?? null,
      status: input.status,
      isDisputeInfluenced: input.isDisputeInfluenced ?? false,
      moderatedBy: null,
      moderatedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.reviews.set(row.id, row);
    return { ...row };
  }

  async findById(id: string): Promise<Review | null> {
    const row = this.reviews.get(id);
    return row && !row.deletedAt ? { ...row } : null;
  }

  async findByRequestAndReviewer(requestId: string, reviewerId: string): Promise<Review | null> {
    const match = [...this.reviews.values()].find(
      (r) => r.requestId === requestId && r.reviewerId === reviewerId && !r.deletedAt,
    );
    return match ? { ...match } : null;
  }

  async update(
    id: string,
    patch: Partial<Pick<Review, 'rating' | 'title' | 'body' | 'status' | 'moderatedBy' | 'moderatedAt'>>,
  ): Promise<Review | null> {
    const current = this.reviews.get(id);
    if (!current || current.deletedAt) return null;
    const updated: Review = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.reviews.set(id, updated);
    return { ...updated };
  }

  async listBySubject(filter: {
    subjectUserId?: string;
    subjectAnimalId?: string;
    status?: ReviewStatus;
    cursor?: string;
    limit: number;
  }): Promise<Review[]> {
    let rows = [...this.reviews.values()].filter((r) => !r.deletedAt);
    if (filter.subjectUserId) rows = rows.filter((r) => r.subjectUserId === filter.subjectUserId);
    if (filter.subjectAnimalId) rows = rows.filter((r) => r.subjectAnimalId === filter.subjectAnimalId);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1).map((r) => ({ ...r }));
  }

  async listAdmin(filter: {
    status?: ReviewStatus;
    cursor?: string;
    limit: number;
  }): Promise<Review[]> {
    let rows = [...this.reviews.values()].filter((r) => !r.deletedAt);
    if (filter.status) rows = rows.filter((r) => r.status === filter.status);
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (filter.cursor) {
      const cursorDate = decodeCursor(filter.cursor);
      rows = rows.filter((r) => r.createdAt < cursorDate);
    }
    return rows.slice(0, filter.limit + 1).map((r) => ({ ...r }));
  }
}
