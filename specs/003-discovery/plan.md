# Implementation Plan: Discovery

**Branch**: `003-discovery` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-discovery/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [002-animal-supply](../002-animal-supply/spec.md)

## Summary

Deliver **M3 / Checkpoint 3**: breeding listing lifecycle (draft → active and other
`Features.md` statuses), publish validation against publish-ready animals and listing-type
rules, PostgreSQL full-text search with filters and deterministic compatibility scoring,
public listing detail (no phone numbers), saved listings, discovery analytics, and
server-rendered city/species SEO pages (en/ur, RTL).

Two NestJS modules (`marketplace`, `matching`) plus web discovery surfaces. Search ranking
uses documented weights from the product contract (breed 25, health 20, pedigree 15,
distance 15, verification 10, outcomes 10, dispute risk 5). `search_vector` is maintained by
a DB trigger — application code never writes it.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js` (service role), existing M1/M2
modules (`animals`, `animal-health`, `pedigree`, `audit`, `analytics`), `class-validator`
DTOs, `@mating/shared` (`LISTING_STATUS`, `LISTING_TYPES`, `COMPATIBILITY_WEIGHTS`,
`BREEDING_METHODS`), React Query + App Router for owner dashboards and SSR SEO routes.

**Storage**: Supabase PostgreSQL; migrations `listings`, `saved_listings`, `search_vector`
trigger + GIN index. Reads `animals`, `animal_media`, `breeds`, `regions` from M2.

**Testing**: `node --test` via `tsx`; deterministic scoring unit tests in
`packages/shared` and `apps/api/test/matching/`; RLS harness from M1; ranking
reproducibility integration test.

**Target Platform**: Linux API host + Vercel web (SSR for SEO pages).

**Performance Goals**: 95% of search requests <2s perceived wait on seed data (SC-002);
relevant listing found in <30s manual test (SC-001).

**Constraints**: PostgreSQL FTS only (no Elasticsearch); public responses MUST omit phone;
private health document paths never in public listing payloads; `search` rate-limit
category; only `active` non-deleted listings in public search/SEO; cursor pagination.

**Scale/Scope**: 2 NestJS modules; ~10 API endpoints; 2 tables + trigger/index; 3 web route
groups (search, detail, SEO browse).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Listing publish/unpublish/pause audited; per-dimension verification labels on detail (no bare "verified"); analytics privacy-filtered | PASS |
| II. Animal Welfare, Legality & Regional Compliance | Publish validates animal publish-ready + listing-type + region eligibility; blocked health prevents publish | PASS |
| III. Security & Privacy by Default | Public listing/detail DTO allowlist excludes phone; health docs via signed URLs owner-only; RLS + RBAC; search rate-limited | PASS |
| IV. Type-Safe, Versioned API Contracts | `/api/v1`, DTOs, cursor pagination, `LISTING_STATUS` enum in shared, OpenAPI drift-gated | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | PostgreSQL FTS + in-process scoring; no Redis/Elasticsearch; modular `marketplace` + `matching` | PASS |
| VI. Quality Gates & Definition of Done | Scoring determinism tests, phone-absence tests, idempotent save tests, SSR SEO metadata tests, migrations documented | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — data-model and
contracts complete; ready for `/speckit-tasks`.

## M3 Module deliverables

| Module | Key outputs |
| --- | --- |
| `marketplace` | `listings` CRUD, publish/pause/unpublish, owner dashboard, public detail |
| `matching` | `GET /listings` search + filters + deterministic scoring + distance |
| `web` (discovery) | Listing detail, search UI, city/species SSR SEO pages (en/ur) |
| `saved-listings` (or nested in marketplace) | `saved_listings` idempotent save/unsave |

## Project Structure

### Documentation (this feature)

```text
specs/003-discovery/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── listings.md
│   ├── search.md
│   └── saved-listings.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
apps/api/src/modules/
├── marketplace/                   # NEW
│   ├── marketplace.controller.ts
│   ├── marketplace.service.ts
│   ├── marketplace.repository.ts
│   ├── dto/
│   ├── policies/listing.policy.ts
│   ├── events/listing-published.event.ts
│   └── marketplace.module.ts
└── matching/                        # NEW
    ├── matching.controller.ts
    ├── matching.service.ts
    ├── scoring/
    │   ├── compatibility-scorer.ts
    │   └── distance.ts
    └── matching.module.ts

apps/web/
├── app/[locale]/(public)/listings/[id]/page.tsx    # SSR detail
├── app/[locale]/(public)/browse/[city]/[species]/page.tsx  # SEO
├── app/[locale]/(dashboard)/listings/                # owner CRUD
├── app/[locale]/(dashboard)/saved/                   # saved list
└── features/discovery/                               # search, save hooks

packages/shared/src/
├── constants/listing.ts             # LISTING_STATUS, LISTING_TYPES, COMPATIBILITY_WEIGHTS
└── types/listing.ts

supabase/migrations/
└── 20250802000000_discovery.sql     # listings, saved_listings, search_vector trigger, RLS
```

**Structure Decision**: Web-application monolith. `marketplace` owns listing lifecycle and
owner mutations; `matching` owns read-heavy search/scoring to keep concerns separated per
`doc/ImplementationPlan.md`. Saved listings may live as a subfolder of `marketplace` if
endpoint count stays small (YAGNI).

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
