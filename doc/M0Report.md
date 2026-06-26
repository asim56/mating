# M0 Foundation — Completion Report

Milestone **M0 Foundation** from `doc/ImplementationPlan.md`, executed against the PR-by-PR work items in `doc/ExecutionBacklog.md`.

- **Scope:** foundation gaps only. **No business features** were implemented.
- **Migrations:** none generated — no M0 work item requires schema (the existing `supabase/migrations/20250620000000_foundation.sql` remains the only migration). Generated only if required, per instruction.
- **Repository structure:** followed the authoritative tree in `ImplementationPlan.md` (`apps/api/src/common`, `apps/api/src/openapi`, `apps/web/lib/i18n`, `packages/ui/src/states`, `scripts/`).
- **Verification:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all pass. Test count: **37** (API 27, UI 6, Web 4).

## Completed

| Item          | Summary                                                                                                                                                                                                                                 | Key files                                                                                                                                                  | Tests                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **SYS-01**    | `GET /api/v1/health` now returns version, uptime, and DB readiness; returns **503** when the dependency probe fails. DB probe is abstracted (`DatabasePinger`) so it is deterministic in tests and swappable for a real SQL ping in M1. | `apps/api/src/modules/health/{health.controller,health.service,database.health}.ts`, `dto/health-response.dto.ts`                                          | `test/health.test.ts`                    |
| **SYS-02**    | Swagger served at `/docs`; OpenAPI document generated from the live Nest graph and exported to `apps/api/openapi.json` via `pnpm --filter @mating/api openapi:export`.                                                                  | `apps/api/src/openapi/{openapi.config,export-openapi}.ts`, `apps/api/openapi.json`                                                                         | `test/openapi.test.ts`                   |
| **PLAT-01**   | Global exception filter normalizes every error to a stable `{ code, message, details? }` (`ApiErrorBody`); global validation pipe strips/rejects unknown fields and returns `VALIDATION_FAILED` with per-field detail.                  | `apps/api/src/common/{errors/error-codes,errors/api-error,filters/all-exceptions.filter,pipes/validation.pipe}.ts`                                         | `test/common/error-filter.test.ts`       |
| **PLAT-02**   | Cursor pagination helper returning `{ data, meta: { nextCursor, hasMore } }`, with limit clamping and opaque base64url cursors; shared query DTO.                                                                                       | `apps/api/src/common/pagination/{cursor,paginated-response.dto}.ts`                                                                                        | `test/common/cursor.test.ts`             |
| **PLAT-03**   | Per-category rate-limit matrix (auth, search, messaging, request-creation, default) + fixed-window guard returning **429** with `Retry-After`. Closes the missing rate-limit requirement.                                               | `apps/api/src/common/rate-limit/{rate-limit.config,rate-limit.guard}.ts`                                                                                   | `test/common/rate-limit.test.ts`         |
| **PLAT-04**   | JWT auth guard (`@Public` aware), role guard (`@Roles`), and an ownership-policy base class. Scaffolding only — no business logic; signature verification is stubbed (see Pending).                                                     | `apps/api/src/common/auth/{roles.decorator,jwt.guard,roles.guard,ownership-policy.base}.ts`                                                                | `test/common/guards.test.ts`             |
| **PLAT-05**   | Reusable RBAC + state-transition test harness (mock execution context, role-matrix asserter, transition-map asserter, JWT/user fixtures) with a passing sample.                                                                         | `apps/api/test/harness/{fixtures,rbac,state-transitions,harness.sample.test}.ts`                                                                           | `test/harness/harness.sample.test.ts`    |
| **WEB-01**    | Locale-routed shell (`/[locale]`) with `en`/`ur`, `dir` flips to RTL for Urdu, framework-agnostic i18n config + client provider, key-parity message catalogs, and a root redirect to the default locale.                                | `apps/web/lib/i18n/{config,provider}.ts(x)`, `apps/web/app/[locale]/{layout,page}.tsx`, `apps/web/app/{layout,page}.tsx`, `apps/web/messages/{en,ur}.json` | `apps/web/lib/i18n/config.test.ts`       |
| **WEB-02**    | Shared, RTL-aware UI states in `@mating/ui`: `LoadingState`, `EmptyState`, `ErrorState`, and a `DataState` switch covering the four async states; consumed by the shell.                                                                | `packages/ui/src/states/{loading,empty,error,index}.tsx`, `packages/ui/src/index.ts`                                                                       | `packages/ui/src/states/states.test.tsx` |
| **DEVOPS-01** | CI migration-validation and OpenAPI drift gates wired into the workflow.                                                                                                                                                                | `scripts/{validate-migrations,validate-openapi}.sh`, `.github/workflows/ci.yml`                                                                            | exercised in CI                          |
| **DEVOPS-02** | API host decision recorded: `web` → Vercel, `api` → long-running host (Railway/Render/Fly) with webhook/outbox rationale.                                                                                                               | `doc/Setup.md` (API Hosting Decision), `doc/Integration.md` (Hosting Topology)                                                                             | n/a (docs)                               |
| **DEVOPS-03** | Documentation drift fixes: README reading order corrected (`.cursor/Context.md`, added `Claude.md`/`MarketPlan.md`), `DeliveryPlan.md` marked deprecated, M0 platform conventions documented.                                           | `README.md`, `doc/DeliveryPlan.md`                                                                                                                         | link paths resolve                       |

### M0 exit criteria (from `ImplementationPlan.md`)

- App boots locally end-to-end — **met** (web builds & prerenders `/en`, `/ur`; API builds and serves `/api/v1/health` + `/docs`).
- Rate-limit config + RBAC/RLS + state-transition test harness — **met**.
- Migration + OpenAPI CI gates — **met**.
- Design-system RTL shell — **met**.
- Doc-drift fixes — **met**.

## Pending

These are intentionally deferred (out of M0 scope) or require follow-up. None block the M0 exit.

1. **Real JWT signature verification.** `StructuralTokenVerifier` validates token shape and expiry only. JWKS/Supabase signature verification lands in **M1 (IDENTITY-01)** by swapping the `TokenVerifier` implementation — the guard contract is already in place.
2. **Real database readiness probe.** The health probe performs an HTTP reachability check against Supabase rather than an SQL round-trip (no DB client/migrations are part of M0). Replace with a pooled SQL `SELECT 1` when the DB client is introduced in **M1**.
3. **Rate-limit store is in-memory.** `FixedWindowStore` is single-instance. A shared store (e.g. Redis) is needed before the API is horizontally scaled (**Phase 4**); thresholds are conservative MVP defaults and should be tuned with real traffic.
4. **Guards are not globally registered.** JWT/role guards are opt-in via decorators (no business routes exist yet). They are wired globally/as needed when protected endpoints arrive in **M1**.
5. **`apps/api/openapi.json` must be committed.** The CI drift gate fails on an untracked/uncommitted document by design; commit the generated file with this change so the gate passes.
6. **CORS is currently permissive** (`app.enableCors()`). Lock down to `CORS_ORIGINS` from validated env during **M7 security review** (or earlier when auth lands).
7. **`next lint` deprecation warning.** Next.js 16 will remove `next lint`; migrate to the ESLint CLI in a future infra PR (non-blocking).

## Risks

| Risk                                                              | Likelihood | Impact | Mitigation / status                                                                                                                                |
| ----------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structural-only JWT verification mistaken for real auth           | Medium     | High   | Clearly scoped as M0 scaffolding; verifier is injectable and replaced in M1 before any protected route ships. No business endpoint is guarded yet. |
| In-memory rate limiting ineffective across multiple API instances | Medium     | Medium | Documented; single long-running host for MVP (see hosting decision). Swap to shared store at horizontal scale.                                     |
| OpenAPI document under `tsx` vs `tsc` divergence                  | Low        | Medium | Document is generated from compiled output (`dist`) in CI; a smoke test also generates it under `tsx`. Drift gate enforces the committed artifact. |
| Decorator metadata under the test runner (`tsx`/esbuild)          | Low        | Medium | Resolved: test runner uses `apps/api/tsconfig.test.json` (`TSX_TSCONFIG_PATH`) so `experimentalDecorators`/metadata apply to test files.           |
| Urdu RTL retrofit drift (from `ImplementationPlan.md` register)   | Medium     | Medium | RTL + i18n baked into the shell now (WEB-01); message-key parity enforced by test.                                                                 |
| API-host webhook/outbox behavior on serverless                    | Medium     | High   | Resolved in DEVOPS-02 (api → long-running host); confirm cron/worker support before M5.                                                            |
| RLS/RBAC drift between API and DB layers                          | Medium     | High   | Ownership-policy base + RBAC harness established now; per-feature state-transition/ownership tests mandated from M1 onward.                        |

## How to verify locally

```bash
pnpm install
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test
pnpm build                                   # web + api
pnpm --filter @mating/api build && pnpm --filter @mating/api openapi:export
bash scripts/validate-migrations.sh
bash scripts/validate-openapi.sh             # passes once openapi.json is committed
```
