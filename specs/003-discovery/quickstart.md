# Quickstart & Validation: Discovery

End-to-end validation that M3 works. Details in `data-model.md`, `contracts/`, and
`tasks.md`.

## Prerequisites

- M1 + M2 complete: auth, animals publish-ready, breeds/regions seeded.
- Local Supabase + API + web running (see `specs/001-identity-auth/quickstart.md`).
- Migration `20250802000000_discovery.sql` applied.

## Setup

```bash
pnpm install
supabase db reset
pnpm --filter @mating/api dev
pnpm --filter @mating/web dev
```

Seed: at least two publish-ready animals in different cities/species for search and SEO tests.

## Validation scenarios

### US1 — Publish a breeding listing (P1)

1. Owner with publish-ready animal: `POST /listings` → `201` `status: draft`.
2. Incomplete listing: `POST /listings/:id/publish` → `400` with field errors.
3. Complete listing: publish → `200` `status: active`; `GET /listings?q=...` includes it;
   `GET /listings/mine` shows active.
4. `POST /listings/:id/pause` → hidden from public search; still in owner dashboard.
5. Animal loses publish-ready (e.g. health blocked in M2) → publish rejected.

### US2 — Search and filter (P1)

1. `GET /listings?species=cattle&city=Lahore` → only matching active listings; cursor
   pagination works.
2. Apply multiple filters → all satisfied in results.
3. Same query + `requesterAnimalId` twice → identical `compatibilityScore` ordering
   (automated test).
4. Exceed search rate limit → `429 RATE_LIMITED` with `Retry-After`.

### US3 — Listing detail safely (P1)

1. `GET /listings/:id` → structured detail; grep response for `+92` / phone patterns → zero
   matches (SC-003).
2. `/en/listings/:id` and `/ur/listings/:id` → RTL on Urdu; translation keys present.
3. Paused/suspended listing URL → 404 or unavailable page.

### US4 — Saved listings (P2)

1. Signed in: `POST /saved-listings { listingId }` → appears in `GET /saved-listings`.
2. Repeat POST → idempotent (no duplicate row).
3. `DELETE /saved-listings/:listingId` → removed; repeat DELETE → 204.
4. Suspend listing → saved list shows unavailable/excluded.

### US5 — SEO browse pages (P3)

1. `GET /en/browse/lahore/cattle` (SSR) → listing summaries in HTML; `generateMetadata` title
   and description present; no auth required.
2. Empty city/species → empty state with metadata; no crash.
3. View page source → structured data / links crawlable.

## Automated test expectations (DoD)

- `COMPATIBILITY_WEIGHTS` sum to 100; scorer unit tests for determinism.
- Public DTO tests: no phone field in serializers.
- Trigger test: insert listing → `search_vector` populated without app write.
- RLS: non-owner cannot mutate listing; public can read active only.
- Analytics: `search_performed` / `listing_viewed` properties exclude health doc paths.

## Done checks

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- OpenAPI includes listing/search/saved routes (CI drift gate green).
- `supabase db reset` applies discovery migration cleanly.
