# Phase 0 Research: Discovery

Resolves technical choices for M3 marketplace, search, scoring, SEO, and saved listings.
Each item: Decision / Rationale / Alternatives considered.

## 1. Full-text search: PostgreSQL `tsvector` + GIN + DB trigger

- **Decision**: Store `listings.search_vector` as `tsvector`; maintain it via
  `listings_search_vector_trg` `BEFORE INSERT OR UPDATE OF title, description` calling
  `listings_search_vector_update()` with weighted `simple` config (title weight A,
  description weight B). GIN index `listings_search_idx`. Application code NEVER writes
  `search_vector` directly.
- **Rationale**: Constitution V mandates PostgreSQL FTS for MVP; trigger guarantees
  consistency across API paths and admin fixes; matches `doc/IntegrationGuide.md`.
- **Alternatives considered**: Application-computed tsvector on every write (rejected:
  drift risk if a path forgets to update); Elasticsearch (rejected: YAGNI); `pg_trgm` only
  without FTS (rejected: weaker relevance for multi-word queries).

## 2. Deterministic compatibility scoring weights

- **Decision**: Publish `COMPATIBILITY_WEIGHTS` in `@mating/shared` matching the product
  contract: breed 25, health 20, pedigree 15, distance 15, verification 10, outcomes 10,
  dispute risk 5 (total 100). `CompatibilityScorer` computes a 0–100 integer per result;
  tie-break order: `score DESC`, `published_at DESC`, `listing.id ASC` (stable UUID sort).
- **Rationale**: Spec FR-005 and SC-004 require documented, reproducible ranking; shared
  constants prevent API/web drift.
- **Alternatives considered**: ML model (deferred post-MVP per spec); dynamic weights per
  region at M3 (rejected: no product requirement yet); random tie-break (rejected: breaks
  SC-004).

## 3. Listing status enum and lifecycle

- **Decision**: `LISTING_STATUS` in `@mating/shared`:
  `draft | pending_review | active | paused | expired | rejected | suspended`. Transitions:
  owner creates `draft`; publish → `active` (or `pending_review` if region config requires);
  owner pause → `paused`; unpublish → `draft`; system/job sets `expired` when `expires_at`
  passed; admin → `suspended`/`rejected`. Only `active` + `deleted_at IS NULL` in public
  search/SEO/detail.
- **Rationale**: Aligns with `doc/Features.md` listing status list and spec FR-003.
- **Alternatives considered**: Fewer statuses merging pending into draft (rejected: product
  contract includes pending review); soft-delete only without paused (rejected: owner needs
  hide-without-delete).

## 4. Publish validation gates

- **Decision**: `POST /listings/:id/publish` requires: linked animal `breeding_status =
  publish_ready`, animal not soft-deleted, listing-type-specific required fields (fee,
  `breeding_method`, availability window, location radius), region eligibility re-check.
  On success: set `published_at`, `status = active`, animal `breeding_status = listed`, emit
  audit `listing.published` and analytics `animal_published`.
- **Rationale**: Constitution II animal eligibility before go-live; M2/M3 boundary per
  002 research.
- **Alternatives considered**: Publish without animal publish-ready (rejected: spec edge
  case); skip listing-type validation (rejected: FR-002).

## 5. Public response privacy (no phone on public pages)

- **Decision**: `PublicListingDto` and SSR page props use an explicit field allowlist;
  `profiles.phone` and any `metadata.phone` are never selected in public repository queries.
  Listing detail includes owner `displayName` and verification dimensions only. Automated
  test scans all public listing JSON/HTML fixtures for E.164 patterns.
- **Rationale**: Constitution III + spec FR-006/SC-003; phone masking in messages is M4 but
  public listings never expose phone regardless.
- **Alternatives considered**: Strip phone in serializer only (rejected: defense-in-depth —
  do not SELECT sensitive columns); show masked phone `+92***` (rejected: spec says absent,
  not masked).

## 6. SEO city/species browse pages

- **Decision**: Next.js 15 App Router server components at
  `[locale]/browse/[city]/[species]`; `generateMetadata` for title/description/OG; JSON-LD
  `ItemList` for active listings; empty state with `noindex` when zero results optional per
  SEO policy. Data fetched from `GET /listings` with `city`, `species`, `status=active` only
  (no auth). RTL via `[locale]` + `dir` attribute.
- **Rationale**: Constitution frontend conventions (SSR for SEO); spec FR-009/US5.
- **Alternatives considered**: Client-only search page for SEO routes (rejected: poor crawler
  support); pre-render all city×species at build (rejected: combinatorial explosion at MVP).

## 7. Saved listings idempotency

- **Decision**: `saved_listings` composite PK `(user_id, listing_id)`; `POST` uses
  `ON CONFLICT DO NOTHING`; `DELETE` is idempotent (204 even if absent). List endpoint
  joins listings and excludes non-`active` or soft-deleted targets (or marks `unavailable`).
  Analytics event `listing_saved` on first insert only.
- **Rationale**: Spec FR-007/SC-005 and IntegrationGuide schema.
- **Alternatives considered**: Separate save history table (rejected: YAGNI); include
  suspended in saved list (rejected: spec edge case).
