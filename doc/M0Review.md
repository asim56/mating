# M0 Repository Review

Read-only validation of the **M0 Foundation** against the seven requested dimensions: architecture, folder structure, CI, env handling, API conventions, RTL setup, and migration strategy. No code was modified to produce this review.

Each dimension carries a verdict — **Pass**, **Pass with notes**, or **Gap** — with evidence (file paths) and recommendations. This review complements the self-assessment in [`doc/M0Report.md`](doc/M0Report.md); overlapping items are cross-referenced rather than re-litigated.

## Summary

- **Architecture** — Pass
- **Folder structure** — Pass with notes (`packages/database/` source-of-truth drift, stray `doc/Untitled`)
- **CI** — Pass with notes (no app-boot/e2e smoke, no security scan, duplicate install)
- **Env handling** — Pass with notes (production secret fail-fast risk)
- **API conventions** — Pass (permissive CORS and structural-only JWT deferred by design)
- **RTL setup** — Pass with notes (client-side `<html dir>` flip, no Urdu font)
- **Migration strategy** — Pass with notes (static-only gate, no rollback, duplicate seed)

Overall the foundation is coherent, well-typed, and faithful to the canonical blueprint in [`doc/ImplementationPlan.md`](doc/ImplementationPlan.md). The notes below are mostly hardening items to address before or during M1; one (production secret fail-fast) is worth resolving early.

---

## 1. Architecture — Pass

pnpm workspaces + Turborepo monorepo with a clean apps/packages split.

- Workspace layout: `apps/{web,api}` and `packages/{config,shared,database,ui}` ([pnpm-workspace.yaml](pnpm-workspace.yaml)).
- Task graph in [turbo.json](turbo.json): `build` depends on `^build`; `lint`/`typecheck`/`test` also depend on `^build`.
- Web — Next.js 15 App Router, React 19, `output: 'standalone'`, `transpilePackages` for the workspace packages ([apps/web/next.config.ts](apps/web/next.config.ts)).
- API — NestJS 11 modular monolith with a global `/api/v1` prefix ([apps/api/src/main.ts](apps/api/src/main.ts)), a cross-cutting `common/` layer, feature `modules/` (only `health` exists today), and an `openapi/` exporter. `API_PREFIX` is centralized in [packages/shared/src/constants/index.ts](packages/shared/src/constants/index.ts).
- Dependency direction is clean: apps consume `@mating/{config,shared,ui}`; no cross-app coupling.

**Notes**

- `lint`/`typecheck`/`test` depending on `^build` is correct for cross-package type resolution but adds build cost on every check; acceptable for a repo this size.
- Injectable seams (`TokenVerifier`, `FixedWindowStore`, `DatabasePinger`) are constructor-default instances rather than registered Nest DI providers ([jwt.guard.ts](apps/api/src/common/auth/jwt.guard.ts), [rate-limit.guard.ts](apps/api/src/common/rate-limit/rate-limit.guard.ts), [database.health.ts](apps/api/src/modules/health/database.health.ts)). This is good for unit testing and fine for M0, but the real implementations must be wired through DI in M1 so configuration and shared state (e.g. a Redis-backed store) can be injected.

**Recommendation:** none blocking. Track the DI wiring as part of M1 when guards become globally registered.

---

## 2. Folder structure — Pass with notes

The on-disk tree matches the canonical structure declared in [doc/ImplementationPlan.md](doc/ImplementationPlan.md) and summarized in [README.md](README.md): `apps/`, `packages/`, `supabase/`, `docker/`, `.github/workflows/`, `doc/`, `.cursor/`. The per-module backend layout (`controller`/`service`/`repository`/`dto`/`entities`/`policies`/`events`/`module`) is documented in [apps/api/src/modules/README.md](apps/api/src/modules/README.md) for M1+.

**Notes**

- **Schema source-of-truth drift.** [doc/ImplementationPlan.md](doc/ImplementationPlan.md) states `supabase/migrations/` is the single source of truth and that `packages/database/` "must not contain a divergent copy of schema migrations or seeds." Yet `packages/database/` currently ships `migrations/.gitkeep`, `seed/seed.sql`, and `policies/README.md`, paralleling `supabase/seed.sql` and `supabase/policies/`. This is the documented drift risk and is deferred to M1, but it presently contradicts the SoT statement and should be collapsed (delete or symlink the duplicates) early in M1 before any real schema lands. `@mating/database` itself correctly holds only placeholder types today ([packages/database/src/index.ts](packages/database/src/index.ts)).
- **Stray tracked file.** `doc/Untitled` is committed and appears to be an accidental artifact. Recommend removing it.

**Recommendation:** in M1, consolidate seeds/policies to `supabase/` only; remove `doc/Untitled`.

---

## 3. CI — Pass with notes

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on PRs and pushes to `main`, with top-level `concurrency` and `cancel-in-progress`. Three jobs:

1. **checks** — `pnpm install --frozen-lockfile`, then format check, lint, typecheck, test, and build (with `NEXT_PUBLIC_*` env injected for the web build).
2. **migrations** — a pure-bash gate ([scripts/validate-migrations.sh](scripts/validate-migrations.sh)); no Node/pnpm needed.
3. **openapi** — `needs: checks`; builds the API and runs the drift gate ([scripts/validate-openapi.sh](scripts/validate-openapi.sh)).

This cleanly gates the four DoD checks plus migration and OpenAPI validation.

**Notes / gaps**

- **No app-boot or e2e smoke.** The M0 exit criterion is "app boots locally end-to-end," but CI only builds — it never starts the API and hits `/api/v1/health` or prerenders/serves `/en` and `/ur`. A lightweight boot-and-curl smoke would close the gap between "builds" and "boots."
- **Duplicate dependency install.** The `openapi` job re-runs `pnpm install` and rebuilds the API rather than reusing artifacts from `checks`; consider caching `dist/` or merging the OpenAPI gate into `checks` to cut runtime.
- **No supply-chain / security scanning.** No Dependabot, CodeQL, or `pnpm audit` step; no test-coverage gate; no Turbo remote cache. None block M0, but they are cheap to add and align with the M7 security-review goal.

**Recommendation:** add a boot+health smoke and a dependency-scan workflow before M1 grows the surface area.

---

## 4. Env handling — Pass with notes

Environment configuration is centralized and Zod-validated in `@mating/config` ([packages/config/src/env.ts](packages/config/src/env.ts), [api.ts](packages/config/src/api.ts), [web.ts](packages/config/src/web.ts)). `parseEnv` throws a descriptive error on invalid configuration, and `.env` is gitignored while `.env.example` is committed and comprehensive ([.env.example](.env.example), [.gitignore](.gitignore)).

**Notes**

- **Production secret fail-fast risk (the one to fix early).** `apiEnvSchema` supplies development defaults for secrets: `SUPABASE_ANON_KEY` defaults to `'dev-anon-key'` and `SUPABASE_SERVICE_ROLE_KEY` to `'dev-service-role-key'` ([packages/config/src/api.ts](packages/config/src/api.ts) lines 14-15). Because these are unconditional defaults, a production process missing real values will boot silently with placeholder credentials instead of failing fast. Recommend a `superRefine`/conditional that requires these (and `DATABASE_URL`, `SUPABASE_URL`) when `NODE_ENV === 'production'` (and likely `staging`).
- **Unused injection.** [apps/api/src/config/app-config.module.ts](apps/api/src/config/app-config.module.ts) injects `ConfigService` into the `API_ENV` factory but the factory reads `process.env` directly, so the injected service is unused. Harmless, but either use it or drop the `inject`.
- **Configured-but-unused vars.** `JWT_AUDIENCE` / `JWT_ISSUER` are validated and present in `.env.example` but not consulted by the current structural verifier — expected until real JWT verification lands in M1.

**Recommendation:** make production secrets required (fail-fast); tidy the unused `ConfigService` injection.

---

## 5. API conventions — Pass

The cross-cutting platform conventions are consistent and contract-stable.

- **Error contract.** Every error normalizes to `{ code, message, details? }` via a global filter ([all-exceptions.filter.ts](apps/api/src/common/filters/all-exceptions.filter.ts)), with a stable, append-only code set and status→code mapping ([error-codes.ts](apps/api/src/common/errors/error-codes.ts)).
- **Validation.** Global validation pipe strips/rejects unknown fields and returns `VALIDATION_FAILED` with per-field details ([main.ts](apps/api/src/main.ts), `common/pipes/validation.pipe.ts`).
- **Pagination.** Opaque base64url cursors with limit clamping and `{ data, meta: { nextCursor, hasMore } }` ([cursor.ts](apps/api/src/common/pagination/cursor.ts)), bounded by `PAGINATION_DEFAULT_LIMIT`/`PAGINATION_MAX_LIMIT`.
- **Rate limiting.** Per-category matrix (default/auth/search/messaging/request_creation) and a fixed-window guard returning `429` with `Retry-After` and `X-RateLimit-*` headers ([rate-limit.config.ts](apps/api/src/common/rate-limit/rate-limit.config.ts), [rate-limit.guard.ts](apps/api/src/common/rate-limit/rate-limit.guard.ts)).
- **OpenAPI.** Generated from the live Nest graph and drift-gated ([openapi.config.ts](apps/api/src/openapi/openapi.config.ts)).
- **Auth/RBAC scaffolding.** JWT guard (`@Public`-aware), role guard, and ownership-policy base ([apps/api/src/common/auth/](apps/api/src/common/auth/jwt.guard.ts)).

**Notes (deferred by design, documented in M0Report)**

- **Permissive CORS.** [main.ts](apps/api/src/main.ts) calls `app.enableCors()` with no options, ignoring the validated `CORS_ORIGINS` value. Lock down to the configured origins when auth lands (M1) rather than waiting for the M7 security review.
- **Structural-only JWT.** `StructuralTokenVerifier` validates shape/expiry but not signature, audience, or issuer ([jwt.guard.ts](apps/api/src/common/auth/jwt.guard.ts)); real JWKS verification is M1. The verifier is injectable, so the guard contract is stable.
- In-memory rate-limit store is single-instance; needs a shared store before horizontal scale.

**Recommendation:** wire `CORS_ORIGINS` into `enableCors()` in M1; otherwise the conventions are solid.

---

## 6. RTL setup — Pass with notes

Localization and RTL are baked into the shell.

- Locales `en`/`ur`, with `ur` flagged RTL and helpers `isRtl`/`dirForLocale`/`translate` (fallback chain ending at the key itself) ([apps/web/lib/i18n/config.ts](apps/web/lib/i18n/config.ts)).
- `/[locale]` routing with `generateStaticParams` prerendering both locales; the locale layout sets `dir`/`lang` on a wrapping element and rejects unknown locales via `notFound()` ([apps/web/app/[locale]/layout.tsx](apps/web/app/[locale]/layout.tsx)).
- Client `LocaleProvider` syncs `document.documentElement.{lang,dir}` so portals outside the localized subtree inherit direction ([apps/web/lib/i18n/provider.tsx](apps/web/lib/i18n/provider.tsx)).
- Message catalogs `en.json`/`ur.json` with key-parity enforced by test (per [doc/M0Report.md](doc/M0Report.md)).

**Notes**

- **`<html dir>` flips on the client.** The root layout hardcodes `<html lang="en" dir="ltr">` and relies on the provider's `useEffect` to flip direction for `/ur`, using `suppressHydrationWarning` ([apps/web/app/layout.tsx](apps/web/app/layout.tsx)). Content direction is correct because the locale layout wraps children in a `dir`-aware element, but the document element is briefly LTR for Urdu (minor FOUC/SEO). Consider deriving `<html dir>` server-side from the route locale.
- **No Urdu/Nastaliq font.** Only `Inter` (latin subset) is loaded ([apps/web/app/layout.tsx](apps/web/app/layout.tsx)); Urdu text will fall back to a system font. Flag for M1 typography.
- Tailwind relies on the built-in `rtl:` variant (driven by the `dir` attribute); UI primitives are described as RTL-aware ([apps/web/tailwind.config.ts](apps/web/tailwind.config.ts), [packages/ui/src/states/](packages/ui/src/states/index.ts)).

**Recommendation:** server-render `<html dir>` and add an Urdu-capable font in M1.

---

## 7. Migration strategy — Pass with notes

`supabase/migrations/` is the declared source of truth, with a single forward migration creating extensions and the `set_updated_at()` trigger helper ([supabase/migrations/20250620000000_foundation.sql](supabase/migrations/20250620000000_foundation.sql)). Local workflow uses the Supabase CLI ([supabase/config.toml](supabase/config.toml), [README.md](README.md)), and a CI gate enforces naming (`<14-digit-timestamp>_<snake>.sql`), non-emptiness, and presence of a `;` terminator ([scripts/validate-migrations.sh](scripts/validate-migrations.sh)).

**Notes / gaps**

- **Static-only validation.** The gate never applies SQL to a real Postgres (`supabase db reset` / `migration up`), so a well-named but semantically broken migration passes CI. Adding an apply-against-ephemeral-Postgres step would catch real breakage before merge.
- **No rollback path.** The Definition of Done in [doc/ImplementationPlan.md](doc/ImplementationPlan.md) calls for "reversible migration," but the Supabase forward-only convention has no down-migrations and nothing enforces reversibility. Clarify the rollback expectation (forward-fix vs. paired down scripts) before M1 schema work.
- **Duplicate seed.** `supabase/seed.sql` and `packages/database/seed/seed.sql` can diverge (see also dimension 2). Consolidate to the `supabase/` copy.

**Recommendation:** add a real `supabase db reset` apply step in CI for M1, decide the rollback policy, and remove the duplicate seed.

---

## Appendix — working-tree note

At review time there is one uncommitted edit: [apps/web/app/layout.tsx](apps/web/app/layout.tsx) adds `suppressHydrationWarning` to `<body>` (to tolerate browser-extension attribute injection, e.g. Grammarly) alongside the existing suppression on `<html>`. This is a reasonable hydration-noise mitigation and does not affect any finding above.
