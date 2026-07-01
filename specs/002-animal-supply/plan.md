# Implementation Plan: Animal Supply

**Branch**: `002-animal-supply` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-animal-supply/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [001-identity-auth](../001-identity-auth/spec.md)

## Summary

Deliver **M2 / Checkpoint 2**: animal CRUD with draft → publish-ready flow, private media via
`StorageProvider`, clinical health records, pedigree lineage, and passive per-dimension
verification badges (default `unverified`). Eligibility gates read canonical region config from
`@mating/shared`; publish-ready is enforced in the domain service before M3 listings link.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js` (service role), existing
`infra/supabase`, `class-validator` DTOs, `@mating/shared` (`SPECIES`, `REGION_DEFINITIONS`,
`STORAGE_BUCKETS`, `StorageProvider` interface), React Query + App Router for owner dashboards.

**Storage**: Supabase PostgreSQL + Supabase Storage buckets (`animal-media`, `health-records`,
`pedigree-documents`). Migrations in `supabase/migrations/`.

**Testing**: `node --test` via `tsx`; RLS harness from M1; eligibility unit tests in
`packages/shared`.

**Target Platform**: Linux API host + Vercel web.

**Performance Goals**: Draft creation <5s; signed upload URL issuance <500ms p95.

**Constraints**: RLS owner-write; signed URLs only for media/docs; audit on publish-ready;
region min-age from config; no bare "verified" labels.

**Scale/Scope**: 4 NestJS modules; ~12 endpoints; 4 tables + storage policies.

## Constitution Check

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust & Audit | Publish-ready + record changes audited; per-dimension verification labels | PASS |
| II. Welfare & Compliance | Eligibility enforced at publish-ready; blocked health status; exotic flag | PASS |
| III. Security & Privacy | Private health/pedigree docs; signed URLs; RLS | PASS |
| IV. API Contracts | `/api/v1`, DTOs, cursor pagination for animal lists, OpenAPI | PASS |
| V. YAGNI | Modular monolith; no Elasticsearch/Redis | PASS |
| VI. Quality Gates | RBAC + eligibility tests; migrations documented | PASS |

**Initial gate**: PASS. **Post-design re-check**: PASS.

## Project Structure

### Documentation

```text
specs/002-animal-supply/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── animals.md
    └── health-pedigree.md
```

### Source Code

```text
apps/api/src/modules/
├── animals/          # NEW: CRUD, media upload-url, publish-ready
├── health/           # REPLACE scaffold: clinical records domain (rename conflict: system health stays)
├── pedigree/         # NEW
└── verification/     # NEW: badge read model + dimension status (no M6 workflow)

apps/web/
├── app/[locale]/(dashboard)/animals/
└── features/animals/

packages/shared/src/
├── constants/animal.ts   # publish-ready rules, verification dimensions
└── types/animal.ts

supabase/migrations/
└── 20250801000000_animal_supply.sql
```

**Note**: Rename or namespace the existing `modules/health` liveness module if still
collocated — `system` owns `GET /health`; clinical module is `animal-health` or keep
`health` per IntegrationGuide with clear imports.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
