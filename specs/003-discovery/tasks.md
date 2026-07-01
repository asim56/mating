# Tasks: Discovery

**Input**: Design documents from `/specs/003-discovery/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md, research.md; M2 (`002-animal-supply`) complete

**Tests**: Constitution-mandated RBAC, eligibility, determinism, phone-absence, and idempotency tests included.

**Organization**: Tasks grouped by user story (US1–US5) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5) on story-phase tasks only
- Include exact file paths in descriptions

## Path Conventions

- **API**: `apps/api/src/modules/`
- **Web**: `apps/web/`
- **Shared**: `packages/shared/src/`
- **Migrations**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold marketplace/matching modules and shared listing contracts.

- [x] T001 Create `MarketplaceModule` scaffold (`module`, `controller`, `service`, `repository`) in `apps/api/src/modules/marketplace/`
- [x] T002 [P] Create `MatchingModule` scaffold in `apps/api/src/modules/matching/`
- [x] T003 [P] Add shared types `ListingStatus`, `ListingType`, `BreedingMethod`, `PublicListingSummary` in `packages/shared/src/types/listing.ts`
- [x] T004 [P] Add `LISTING_STATUS`, `LISTING_TYPES`, `COMPATIBILITY_WEIGHTS`, `LISTING_PUBLISH_REQUIREMENTS` in `packages/shared/src/constants/listing.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Discovery schema, RLS, search trigger, rate limits, audit/analytics — **blocks all user stories**.

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [x] T005 Create migration `supabase/migrations/20250802000000_discovery.sql` with `listings` and `saved_listings` tables per `data-model.md`
- [x] T006 [P] Add `search_vector` trigger `listings_search_vector_trg`, GIN index `listings_search_idx`, and partial indexes in `supabase/migrations/20250802000000_discovery.sql`
- [x] T007 [P] Add RLS policies (public read `active` non-deleted; owner CRUD own rows) in `supabase/migrations/20250802000000_discovery.sql`
- [x] T008 Implement `ListingPolicy` publish validation (animal publish-ready, listing-type fields, region re-check) in `apps/api/src/modules/marketplace/policies/listing.policy.ts`
- [x] T009 Register `MarketplaceModule` and `MatchingModule` in `apps/api/src/app.module.ts`
- [x] T010 [P] Wire audit events `listing.created`, `listing.published`, `listing.paused`, `listing.unpublished` in `apps/api/src/modules/marketplace/events/`
- [x] T011 [P] Configure `search` rate-limit category for `GET /listings` in `apps/api/src/common/rate-limit/`
- [x] T012 Trigger test: insert listing populates `search_vector` without app write in `apps/api/test/matching/search-vector.test.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Publish a breeding listing (Priority: P1) 🎯 MVP

**Goal**: Owners create draft listings from publish-ready animals and publish to active (or pending_review).

**Independent Test**: Publish from publish-ready animal → active and searchable; incomplete publish rejected; pause hides from public search.

### Tests for User Story 1

- [x] T013 [P] [US1] RBAC test: non-owner cannot `POST /listings/:id/publish` in `apps/api/test/marketplace/rbac.test.ts`
- [x] T014 [P] [US1] Eligibility test: animal not publish-ready or health blocked rejects publish in `apps/api/test/marketplace/publish-eligibility.test.ts`

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement `MarketplaceRepository` with owner-scoped listing queries in `apps/api/src/modules/marketplace/marketplace.repository.ts`
- [x] T016 [P] [US1] Create listing DTOs (`CreateListingDto`, `UpdateListingDto`, `ListingResponseDto`) in `apps/api/src/modules/marketplace/dto/`
- [x] T017 [US1] Implement `MarketplaceService` draft CRUD and one-active-listing-per-animal guard in `apps/api/src/modules/marketplace/marketplace.service.ts`
- [x] T018 [US1] Implement `POST /listings`, `PATCH /listings/:id`, `GET /listings/mine` in `apps/api/src/modules/marketplace/marketplace.controller.ts`
- [x] T019 [US1] Implement `POST /listings/:id/publish`, `pause`, `unpublish` with animal `breeding_status` transitions in `apps/api/src/modules/marketplace/marketplace.service.ts`
- [x] T020 [US1] Expose publish/pause/unpublish endpoints in `apps/api/src/modules/marketplace/marketplace.controller.ts`
- [x] T021 [US1] Build owner listings dashboard in `apps/web/app/[locale]/(dashboard)/listings/` and publish flow in `apps/web/features/discovery/listing-form.tsx`

**Checkpoint**: User Story 1 independently testable.

---

## Phase 4: User Story 2 — Search and filter listings (Priority: P1)

**Goal**: Public full-text search with filters and deterministic compatibility scoring.

**Independent Test**: Filters respected; identical inputs produce identical ranking order; rate limit returns `429`.

### Tests for User Story 2

- [x] T022 [P] [US2] Unit tests: `COMPATIBILITY_WEIGHTS` sum to 100 and scorer determinism in `packages/shared/test/compatibility-scorer.test.ts`
- [x] T023 [P] [US2] Integration test: repeated search with `requesterAnimalId` yields identical order in `apps/api/test/matching/ranking.test.ts`

### Implementation for User Story 2

- [x] T024 [P] [US2] Implement `CompatibilityScorer` with documented weights in `apps/api/src/modules/matching/scoring/compatibility-scorer.ts`
- [x] T025 [P] [US2] Implement haversine `distance.ts` helper in `apps/api/src/modules/matching/scoring/distance.ts`
- [x] T026 [US2] Implement `MatchingService` search query builder (FTS, filters, cursor pagination) in `apps/api/src/modules/matching/matching.service.ts`
- [x] T027 [US2] Implement `GET /listings` search endpoint in `apps/api/src/modules/matching/matching.controller.ts`
- [x] T028 [US2] Emit `search_performed` analytics (filter summary, no health doc paths) in `apps/api/src/modules/matching/matching.service.ts`
- [x] T029 [US2] Rate-limit integration test `429 RATE_LIMITED` in `apps/api/test/matching/rate-limit.test.ts`
- [x] T030 [US2] Build search UI with filters and cursor pagination in `apps/web/features/discovery/search/`

**Checkpoint**: User Stories 1 and 2 independently testable.

---

## Phase 5: User Story 3 — View listing detail safely (Priority: P1)

**Goal**: Public listing detail with per-dimension verification, no phone numbers, en/ur support.

**Independent Test**: Detail response has zero phone patterns; Urdu RTL; paused/suspended returns unavailable.

### Tests for User Story 3

- [x] T031 [P] [US3] Phone-absence test: scan `GET /listings/:id` JSON for E.164 patterns in `apps/api/test/marketplace/public-detail.test.ts`
- [x] T032 [P] [US3] RLS test: public can read `active` only; owner sees own non-active in `apps/api/test/marketplace/rls.test.ts`

### Implementation for User Story 3

- [x] T033 [US3] Implement `PublicListingDetailDto` with explicit field allowlist (no `phone`) in `apps/api/src/modules/marketplace/dto/public-listing-detail.dto.ts`
- [x] T034 [US3] Implement `GET /listings/:id` public detail with `listing_viewed` analytics in `apps/api/src/modules/marketplace/marketplace.controller.ts`
- [x] T035 [US3] Build SSR listing detail page in `apps/web/app/[locale]/(public)/listings/[id]/page.tsx`
- [x] T036 [US3] Add Urdu RTL layout and translation keys for detail in `apps/web/app/[locale]/(public)/listings/[id]/`
- [x] T037 [US3] Handle paused/suspended/soft-deleted unavailable state in `apps/web/app/[locale]/(public)/listings/[id]/not-found.tsx`
- [x] T038 [US3] Render verification dimension badges on public detail in `apps/web/features/discovery/listing-detail.tsx`

**Checkpoint**: User Stories 1–3 independently testable.

---

## Phase 6: User Story 4 — Save listings (Priority: P2)

**Goal**: Authenticated users save/unsave listings idempotently; unavailable listings flagged.

**Independent Test**: Save appears in dashboard; duplicate save no-op; unsave idempotent; suspended listing marked unavailable.

### Tests for User Story 4

- [x] T039 [P] [US4] Idempotent save/unsave integration test in `apps/api/test/marketplace/saved-listings.test.ts`

### Implementation for User Story 4

- [x] T040 [P] [US4] Implement `SavedListingsRepository` in `apps/api/src/modules/marketplace/saved-listings.repository.ts`
- [x] T041 [US4] Implement `GET /saved-listings`, `POST /saved-listings`, `DELETE /saved-listings/:listingId` in `apps/api/src/modules/marketplace/saved-listings.controller.ts`
- [x] T042 [US4] Handle suspended/non-active listings as `available: false` in saved list response in `apps/api/src/modules/marketplace/saved-listings.service.ts`
- [x] T043 [US4] Emit `listing_saved` analytics on first save in `apps/api/src/modules/marketplace/saved-listings.service.ts`
- [x] T044 [US4] Build saved listings dashboard in `apps/web/app/[locale]/(dashboard)/saved/`
- [x] T045 [US4] Implement `useSavedListing` hook in `apps/web/features/discovery/use-saved-listing.ts`

**Checkpoint**: User Stories 1–4 independently testable.

---

## Phase 7: User Story 5 — SEO browse pages (Priority: P3)

**Goal**: Server-rendered city/species browse pages with metadata, crawlable links, en/ur locales.

**Independent Test**: SSR HTML contains listing summaries and metadata; empty combination shows empty state; no auth required.

### Tests for User Story 5

- [x] T046 [P] [US5] SSR metadata test for `generateMetadata` title/description in `apps/web/test/browse-seo.test.ts`

### Implementation for User Story 5

- [x] T047 [US5] Build SSR browse page in `apps/web/app/[locale]/(public)/browse/[city]/[species]/page.tsx`
- [x] T048 [US5] Implement `generateMetadata` for city/species SEO in `apps/web/app/[locale]/(public)/browse/[city]/[species]/page.tsx`
- [x] T049 [US5] Add JSON-LD `ItemList` structured data component in `apps/web/features/discovery/seo-item-list.tsx`
- [x] T050 [US5] Implement empty-state with correct metadata when zero listings in `apps/web/app/[locale]/(public)/browse/[city]/[species]/empty.tsx`
- [x] T051 [US5] Wire en/ur locale routing and RTL `dir` attribute for browse pages in `apps/web/app/[locale]/(public)/browse/`

**Checkpoint**: All user stories independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: API contract, docs, and end-to-end validation.

- [x] T052 [P] Update OpenAPI with listing, search, and saved-listings routes in `apps/api/openapi.yaml`
- [x] T053 [P] Update `doc/Features.md` and `doc/IntegrationGuide.md` for M3 discovery behavior
- [x] T054 Verify OpenAPI drift CI gate passes for new endpoints
- [x] T055 Run `specs/003-discovery/quickstart.md` validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately (requires M2 animals publish-ready)
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–7)**: Depend on Foundational completion
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — requires M2 publish-ready animals
- **US2 (P1)**: After US1 publish flow — needs active listings in DB
- **US3 (P1)**: After US1 — public detail reads active listings
- **US4 (P2)**: After US1 — saves reference active listings
- **US5 (P3)**: After US2 — browse pages call search/list projection

### Parallel Opportunities

- T002–T004 module and shared constants in parallel
- T006–T007 migration indexes and RLS in parallel
- US2 scorer (T024) and distance helper (T025) in parallel
- US3 phone test (T031) and RLS test (T032) in parallel

---

## Parallel Example: User Story 2

```bash
# Tests in parallel:
T022: Scorer unit tests in packages/shared/test/compatibility-scorer.test.ts
T023: Ranking integration test in apps/api/test/matching/ranking.test.ts

# Implementation in parallel:
T024: CompatibilityScorer in apps/api/src/modules/matching/scoring/compatibility-scorer.ts
T025: distance.ts in apps/api/src/modules/matching/scoring/distance.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE** via quickstart US1 scenarios

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → listing publish lifecycle (MVP supply surface)
3. US2 → search + deterministic ranking
4. US3 → safe public detail pages
5. US4 → saved listings
6. US5 → SEO city/species browse pages

### Parallel Team Strategy

- Developer A: US1 + marketplace lifecycle
- Developer B: US2 + matching/scoring
- Developer C: US3–US5 web surfaces (detail, saved, SEO)

---

## Notes

- Application code must NEVER write `listings.search_vector` — DB trigger only
- Public listing DTOs must not SELECT `profiles.phone` (defense in depth)
- Only `active` non-deleted listings appear in search, detail, SEO, and save targets
- Tie-break order: `compatibilityScore DESC`, `published_at DESC`, `id ASC`
