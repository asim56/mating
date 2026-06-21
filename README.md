# Mating Marketplace

Pakistan-first animal breeding marketplace monorepo. This repository ships the **project foundation** — tooling, shared libraries, Docker, CI/CD, and app scaffolds. Business features are implemented in subsequent checkpoints per `doc/Agent.md`.

## Stack

| Layer | Technology |
| --- | --- |
| Web | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS |
| API | NestJS 11, REST `/api/v1`, OpenAPI/Swagger |
| Database | Supabase PostgreSQL, migrations, RLS |
| State (web) | React Query, Zustand |
| Monorepo | pnpm workspaces, Turborepo |
| Deploy target | Vercel (web + API), Supabase |

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

| Service | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| API docs (Swagger) | http://localhost:4000/docs |
| Health check | http://localhost:4000/api/v1/health |

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

Foundation migration: `supabase/migrations/20250620000000_foundation.sql` (extensions and `updated_at` helper only).

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
6. Validate SQL migrations
7. Verify OpenAPI scaffold

Deployment target: Vercel preview on PR, staging/production on `main` (configure in Vercel).

## Shared Libraries

### `@mating/config`

Zod schemas for web and API environment variables with safe parsing helpers.

### `@mating/shared`

- API constants (`API_PREFIX`, roles, breeding methods, storage buckets)
- Pagination and error types
- Provider interfaces (`PaymentProvider`, `NotificationProvider`, `StorageProvider`) per `doc/Integration.md`

### `@mating/database`

Placeholder for generated Supabase types and migration tooling references.

### `@mating/ui`

Shared React components (e.g. `Button`) consumed by the web app.

## Documentation

Read in this order before implementing features:

1. [`doc/Context.md`](doc/Context.md) — business context and architecture
2. [`doc/Features.md`](doc/Features.md) — product scope and RBAC
3. [`.cursor/Rule.md`](.cursor/Rule.md) — development and business rules
4. [`doc/IntegrationGuide.md`](doc/IntegrationGuide.md) — schema, API contracts, module structure
5. [`doc/Integration.md`](doc/Integration.md) — external providers
6. [`doc/Setup.md`](doc/Setup.md) — deployment, observability, DR
7. [`doc/Agent.md`](doc/Agent.md) — agent workflow and checkpoints

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
