# Mating Marketplace

Pakistan-first animal breeding marketplace monorepo. This repository ships the **project foundation** — tooling, shared libraries, Docker, CI/CD, and app scaffolds. Business features are implemented in subsequent checkpoints per `doc/Agent.md`.

## Stack

| Layer         | Technology                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Web           | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS              |
| API           | NestJS 11, REST `/api/v1`, OpenAPI/Swagger                               |
| Database      | Supabase PostgreSQL, migrations, RLS                                     |
| State (web)   | React Query, Zustand                                                     |
| Monorepo      | pnpm workspaces, Turborepo                                               |
| Deploy target | `web` → Vercel; `api` → long-running host (Railway/Render/Fly); Supabase |

## Repository Structure

```text
.
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS REST API
├── packages/
│   ├── config/              # Zod-validated environment config
│   ├── shared/              # Types, constants, integration interfaces
│   ├── database/            # Migration references, DB types placeholder
│   └── ui/                  # Shared React primitives
├── supabase/
│   ├── migrations/          # SQL migrations
│   ├── policies/            # RLS policies (added with schema)
│   └── seed.sql
├── docker/                  # Docker Compose and Dockerfiles
├── .github/workflows/       # CI/CD
└── doc/                     # Product and architecture blueprint
```

## Prerequisites

- Node.js 22+ (see `.nvmrc`)
- pnpm 9+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, for local Supabase)
- Docker (optional, for containerized local stack)

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Run all apps in development
pnpm dev
```

| Service            | URL                                 |
| ------------------ | ----------------------------------- |
| Web                | http://localhost:3000               |
| API                | http://localhost:4000               |
| API docs (Swagger) | http://localhost:4000/docs          |
| Health check       | http://localhost:4000/api/v1/health |

The health endpoint reports version and dependency readiness; it returns `503` when the database is unreachable.

## Commands

```bash
pnpm dev          # Start web and API in watch mode
pnpm build        # Build all packages and apps
pnpm lint         # Type-check / lint all workspaces
pnpm typecheck    # TypeScript validation
pnpm test         # Run unit tests
pnpm format       # Format with Prettier
```

### Per-workspace

```bash
pnpm --filter @mating/web dev
pnpm --filter @mating/api dev
pnpm --filter @mating/shared build
```

## Environment Variables

Copy `.env.example` to `.env` at the repository root. Variables are validated via `@mating/config`:

- **Web** — `getWebEnv()` from `@mating/config/web`
- **API** — `getApiEnv()` from `@mating/config/api`

Development defaults are provided for local Supabase URLs and keys. Production and staging values must be set explicitly in Vercel/Supabase dashboards.

## Supabase Local Development

```bash
supabase start
supabase db reset
supabase migration new <name>
```

Migrations:

- `supabase/migrations/20250620000000_foundation.sql` — extensions and `updated_at` helper.
- `supabase/migrations/20250701000000_regions.sql` — `regions` table (RLS: active regions are public-readable) seeded via `supabase/seed.sql`.

## Docker

```bash
# Postgres + API + Web
docker compose -f docker/docker-compose.yml up --build
```

- **Postgres** — port `54322`
- **API** — port `4000`
- **Web** — port `3000`

For full Supabase (Auth, Storage, Realtime), use `supabase start` alongside or instead of the Compose Postgres service.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pull requests and pushes to `main`:

1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Format check
3. Lint and typecheck
4. Unit tests
5. Build web and API
6. Validate SQL migrations (`scripts/validate-migrations.sh`)
7. Validate the OpenAPI document and fail on drift (`scripts/validate-openapi.sh`)

The OpenAPI document is generated from the live Nest application graph via `pnpm --filter @mating/api openapi:export` and committed at `apps/api/openapi.json`; CI regenerates it and fails if it drifts.

Deployment target: `web` to Vercel (preview on PR, staging/production on `main`); `api` to a long-running host. See `doc/Setup.md` → "API Hosting Decision".

## Shared Libraries

### `@mating/config`

Zod schemas for web and API environment variables with safe parsing helpers.

### `@mating/shared`

- API constants (`API_PREFIX`, roles, breeding methods, storage buckets)
- Pagination and error types
- Provider interfaces (`PaymentProvider`, `NotificationProvider`, `StorageProvider`) per `doc/Integration.md`
- Canonical region configuration (`@mating/shared/config`): typed eligibility + compliance accessors (`getRegionConfig`, `getSpeciesEligibility`) and the seeded `REGION_DEFINITIONS` — the single source of truth shared by the `regions` seed and the API

### `@mating/database`

Placeholder for generated Supabase types and migration tooling references.

### `@mating/ui`

Shared, RTL-aware React primitives: `Button` plus the four async UI states (`LoadingState`, `EmptyState`, `ErrorState`, and the `DataState` switch) consumed across the web app.

## API Platform Conventions (`apps/api/src/common`)

Cross-cutting primitives every feature module builds on:

- **Stable error contract** — all errors serialize to `{ code, message, details? }` via a global exception filter; codes live in `common/errors/error-codes.ts`.
- **Validation** — global pipe strips/rejects unknown fields and returns `VALIDATION_FAILED` with per-field details.
- **Cursor pagination** — `common/pagination` returns `{ data, meta: { nextCursor, hasMore } }`.
- **Rate limiting** — per-category matrix (auth/search/messaging/request-creation) in `common/rate-limit`, returning `429` with a retry hint.
- **Auth/RBAC scaffolding** — JWT guard, role guard (`@Roles`), `@Public`, and an ownership-policy base class (no business logic yet).

A reusable RBAC + state-transition test harness lives in `apps/api/test/harness/`.

## Feature Modules

### `config/regions` (M1)

Region, currency, locale, and the eligibility + compliance configuration consumed by later region-scoped features. Migration: `supabase/migrations/20250701000000_regions.sql`; seed: `supabase/seed.sql` (Pakistan active; United States staged inactive for Phase 3). The seeded `regions.config` jsonb mirrors `@mating/shared/config`.

| Method  | Path                          | Access      | Description                                                |
| ------- | ----------------------------- | ----------- | ---------------------------------------------------------- |
| `GET`   | `/api/v1/regions`             | Public      | Active regions (currency, locale, payment methods)         |
| `GET`   | `/api/v1/admin/regions`       | super_admin | All regions with full configuration                        |
| `GET`   | `/api/v1/admin/regions/:code` | super_admin | Single region with full configuration                      |
| `PATCH` | `/api/v1/admin/regions/:code` | super_admin | Update region config; emits a `region.updated` audit event |

Admin routes require the `super_admin` role (`403` otherwise); region configuration (eligibility/compliance) is never exposed on the public endpoint.

## Documentation

Read in this order before implementing features:

1. [`.cursor/Context.md`](.cursor/Context.md) — business context and architecture
2. [`doc/Features.md`](doc/Features.md) — product scope and RBAC
3. [`.cursor/Rule.md`](.cursor/Rule.md) — development and business rules
4. [`doc/Claude.md`](doc/Claude.md) — engineering standards and Definition of Done
5. [`doc/IntegrationGuide.md`](doc/IntegrationGuide.md) — schema, API contracts, module structure
6. [`doc/Integration.md`](doc/Integration.md) — external providers
7. [`doc/Setup.md`](doc/Setup.md) — deployment, observability, DR
8. [`doc/Agent.md`](doc/Agent.md) — agent workflow and checkpoints
9. [`doc/MarketPlan.md`](doc/MarketPlan.md) — business strategy and the business risk register

Engineering execution is planned in [`doc/ImplementationPlan.md`](doc/ImplementationPlan.md) (source of truth) and sequenced into PRs in [`doc/ExecutionBacklog.md`](doc/ExecutionBacklog.md). [`doc/DeliveryPlan.md`](doc/DeliveryPlan.md) is **deprecated** and superseded by `ImplementationPlan.md`.

## What's Included (Foundation)

- Monorepo with pnpm + Turborepo
- Next.js and NestJS app scaffolds (health endpoint, landing page)
- Shared config, types, UI, and integration interfaces
- Supabase config and foundation migration
- Docker Compose and Dockerfiles
- GitHub Actions CI
- Environment template and validation

## What's Not Included

Business features are intentionally deferred:

- Auth, profiles, and RBAC
- Animal profiles, listings, breeding requests
- Payments, messaging, verification
- Admin dashboard and analytics

See **Checkpoint 1** in `doc/Agent.md` for the first implementation milestone.

## License

Private — all rights reserved.
