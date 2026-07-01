import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { ApiError, ERROR_CODES, clampLimit, type AuthenticatedUser } from '../../common';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  ANIMALS_REPOSITORY,
  type InMemoryAnimalsRepository,
} from '../animals/animals.repository';
import { toPublicSummary } from '../marketplace/dto/listing-response.dto';
import type { Listing } from '../marketplace/entities/listing.entity';
import {
  InMemoryMarketplaceRepository,
  MARKETPLACE_REPOSITORY,
} from '../marketplace/marketplace.repository';
import { CompatibilityScorer } from './scoring/compatibility-scorer';

export type SearchQuery = {
  q?: string;
  species?: string;
  city?: string;
  regionCode?: string;
  requesterAnimalId?: string;
  cursor?: string;
  limit?: number;
  sort?: 'relevance' | 'newest' | 'fee_asc' | 'fee_desc';
};

@Injectable()
export class MatchingService {
  private readonly scorer = new CompatibilityScorer();

  constructor(
    @Inject(MARKETPLACE_REPOSITORY) private readonly listings: InMemoryMarketplaceRepository,
    @Inject(ANIMALS_REPOSITORY) private readonly animals: InMemoryAnimalsRepository,
    private readonly analytics: AnalyticsService,
  ) {}

  async search(query: SearchQuery, user?: AuthenticatedUser) {
    const limit = Math.min(clampLimit(query.limit), 50);
    let rows = await this.listings.searchActive({
      species: query.species,
      city: query.city,
      regionCode: query.regionCode,
      q: query.q,
    });

    let requesterAnimal = null;
    if (query.requesterAnimalId) {
      if (!user) {
        throw new ApiError(ERROR_CODES.FORBIDDEN, 'Authentication required.', HttpStatus.FORBIDDEN);
      }
      requesterAnimal = await this.animals.findById(query.requesterAnimalId);
      if (!requesterAnimal || requesterAnimal.ownerId !== user.id) {
        throw new ApiError(ERROR_CODES.VALIDATION_FAILED, 'Invalid requester animal.', HttpStatus.BAD_REQUEST);
      }
    }

    const scored = rows.map((listing) => {
      const { score, distanceKm } = this.scorer.score(listing, { requesterAnimal });
      return { listing, score, distanceKm };
    });

    const sort = query.sort ?? (query.q || query.requesterAnimalId ? 'relevance' : 'newest');
    scored.sort((a, b) => this.compare(sort, a, b));

    const page = scored.slice(0, limit + 1);
    const summaries = page.slice(0, Math.min(page.length, limit)).map(({ listing, score, distanceKm }) =>
      toPublicSummary(listing, { compatibilityScore: score, distanceKm: distanceKm ?? undefined }),
    );

    await this.analytics.capture({
      event: 'search_performed',
      accountId: user?.id ?? null,
      properties: {
        resultCount: summaries.length,
        filters: {
          species: query.species,
          city: query.city,
          regionCode: query.regionCode,
          hasQuery: Boolean(query.q),
        },
      },
    });

    const last = page[Math.min(limit, page.length) - 1];
    const hasMore = page.length > limit;
    return {
      data: summaries,
      meta: {
        hasMore,
        nextCursor:
          hasMore && last
            ? `${last.score}:${last.listing.publishedAt}:${last.listing.id}`
            : null,
      },
    };
  }

  private compare(
    sort: string,
    a: { listing: Listing; score: number; distanceKm: number | null },
    b: { listing: Listing; score: number; distanceKm: number | null },
  ): number {
    if (sort === 'relevance') {
      if (b.score !== a.score) return b.score - a.score;
      const pub = (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? '');
      if (pub !== 0) return pub;
      return a.listing.id.localeCompare(b.listing.id);
    }
    if (sort === 'fee_asc') {
      return (a.listing.priceAmount ?? 0) - (b.listing.priceAmount ?? 0);
    }
    if (sort === 'fee_desc') {
      return (b.listing.priceAmount ?? 0) - (a.listing.priceAmount ?? 0);
    }
    return (b.listing.publishedAt ?? '').localeCompare(a.listing.publishedAt ?? '');
  }
}
