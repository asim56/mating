# Implementation Plan: Identity, Profiles & Platform Foundation (M1 + inline M0)

**Branch**: `001-identity-auth` | **Date**: 2026-06-30 (amended) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-identity-auth/spec.md` (amended per
`specs/000-product-scope`: dual PK/US geography, M0 folded inline).

**Parent scope**: [000-product-scope](../000-product-scope/spec.md)

## Summary

Deliver **Checkpoint 1** in one feature: inline **M0 foundation** (API conventions,
rate limits, RBAC/RLS test harness, CI gates, RTL/i18n shell, doc fixes) plus **M1**
identity, profiles, region/breed config, and cross-cutting **audit**, **analytics**, and
**notifications/outbox** cores.

**Auth approach**: Supabase Auth (GoTrue) for phone-OTP (PK-primary) and email/password
(US-primary and cross-region); first real Supabase service-role client; server-owned
`sessions` table for ≤1-minute revocation; `profiles`, roles, consents, and notification
preferences; PK + US `regions` seed and PK breed taxonomy; immutable audit + analytics +
transactional outbox with stub drainer.

OTP/email credential delivery stays in Supabase Auth (Twilio SMS, Resend SMTP). Domain
notification delivery uses the outbox + stub `NotificationProvider` with en/ur template
lookup.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js` (NEW — Auth admin + table
access via service role), `jose` (NEW — JWKS verification of Supabase access tokens),
`class-validator`/`class-transformer` (DTOs), Zod (`@mating/config` env), React Query +
Next.js App Router (web). SMS via Twilio (`SMS_PROVIDER=twilio|local`), email via Resend —
both configured in Supabase Auth, not called directly.

**Storage**: Supabase PostgreSQL; `supabase/migrations/` is the schema source of truth.
Supabase Auth (`auth.users`, `auth.sessions`) owns credentials; this feature adds
`public` tables: `regions`, `breeds`, `profiles`, `account_status`, `user_roles`,
`sessions`, `consents`, `notification_preferences`, `audit_logs`, `analytics_events`,
`outbox_messages`, `notification_logs`, `devices`.

**Testing**: Node built-in test runner (`node --test`) via `tsx` for the API; existing
`*.test.ts` convention in `packages/*` and `apps/api/test/`.

**Target Platform**: Linux server (NestJS API under `/api/v1`) + SSR web (Next.js). API
host is a long-running host per the M0 decision (not serverless).

**Project Type**: Web application (monorepo: `apps/web` frontend + `apps/api` backend +
`packages/*`).

**Performance Goals**: Phone-OTP sign-up completes in <2 min (SC-001); session revocation
effective within 1 min (SC-003); auth endpoints stay within the existing per-category rate
limits (SC-006).

**Constraints**: PK phone E.164 `+92` for phone-OTP; US email-first with optional `+1`
phone; defense-in-depth (API RBAC + DB RLS); service-role key server-only; non-leaking auth
error responses; immutable audit + privacy-filtered analytics.

**Scale/Scope**: MVP launch scale (single API instance acceptable); ~15 auth/profile/
admin endpoints; ~12 new tables + M0 harness; 8 NestJS domain modules touched or created.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Role/status changes, suspend/reactivate, and session revocation emit immutable audit events; `audit_logs` is append-only (DB grants revoke UPDATE/DELETE). | PASS |
| II. Animal Welfare, Legality & Regional Compliance | PK + US regions seeded with eligibility/compliance jsonb; conservative PK defaults; no listing/welfare enforcement surface yet. US payment metadata is stub-only. | PASS |
| III. Security & Privacy by Default | JWT (Supabase) + RBAC (API guards) + RLS (DB); auth rate-limited via existing matrix; service-role key server-only; non-leaking errors; no public PII surface. | PASS |
| IV. Type-Safe, Versioned API Contracts | `/api/v1`, OpenAPI drift-gated, DTO validation, stable `{code,message,details?}` errors, cursor pagination for session list. Idempotency keys not required (no payment/record/completion endpoints here). | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | Domain modules (`identity`, `users`, `regions`, `breeds`, `audit`, `analytics`, `notifications`) with shared infra; no Redis/queue/Elasticsearch; stub notification drainer only. | PASS |
| VI. Quality Gates & Definition of Done | Tests cover auth, profile, RBAC, audit emitters, outbox idempotency; migrations reversible; web i18n/RTL auth states; CI migration + OpenAPI gates; docs updated. | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — data-model and
contracts complete; ready for `/speckit-tasks`.

## M0 Foundation (inline deliverables)

Shipped in the same PR train as M1; no separate feature branch.

| Area | Deliverable | Acceptance |
| --- | --- | --- |
| `system` | Health endpoint with version + DB readiness; Swagger `/docs` export | 503 when DB down; OpenAPI JSON for CI |
| `common/` | Validation pipe, `ApiErrorBody` filter, cursor pagination helper | 400 with stable codes; pagination unit test |
| `common/` | Rate-limit matrix (auth, search, messaging, request-creation) | 429 + retry hint; thresholds documented |
| `common/auth` | JWT guard + role guard + ownership policy base; JWKS verifier | 401/403 unit tests |
| `common/testing` | RBAC/RLS state-transition harness + sample CI test | Harness reused by identity tests |
| `apps/web` | `[locale]` routing, `en.json`/`ur.json`, Tailwind RTL `dir` | Locale flip changes direction |
| `packages/ui` | Loading/empty/error/success primitives | Used by auth shell |
| CI | Migration validation + OpenAPI drift job | Fails on drift/malformed SQL |
| Docs | API host in `Setup.md`; README path fixes | Links resolve; DeliveryPlan deprecation note |

## M1 Module deliverables

| Module | Key outputs |
| --- | --- |
| `config/regions` | `regions` migration; PK + US seed; admin read/update; eligibility jsonb |
| `breeds` | `breeds` migration; PK priority species seed; admin CRUD |
| `identity` | Supabase Auth integration; sessions mirror; recovery; admin revoke |
| `users` | `profiles`, `user_roles`, `consents`, `notification_preferences`; `/me`, admin users |
| `audit` | `audit_logs` append-only; emitter service; event catalog for M1 actions |
| `analytics` | `analytics_events`; capture with privacy filters; `user_signed_up` |
| `notifications` | `outbox_messages`, `notification_logs`, `devices`; stub drainer; `/devices*` |

## Project Structure

### Documentation (this feature)

```text
specs/001-identity-auth/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 (auth, sessions, admin, profiles, regions)
│   ├── auth.md
│   ├── sessions.md
│   ├── admin.md
│   ├── profiles.md
│   └── regions.md
├── checklists/
│   └── requirements.md  # Existing spec-quality checklist
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
apps/api/src/
├── common/                          # M0 + shared
│   ├── auth/
│   │   ├── jwt.guard.ts             # MODIFY: JWKS verifier
│   │   ├── roles.guard.ts           # M0 scaffold → wired
│   │   └── jwks-token-verifier.ts # NEW
│   ├── filters/                     # ApiErrorBody (M0)
│   ├── pagination/                  # cursor helper (M0)
│   ├── rate-limit/                  # matrix (M0)
│   └── testing/                     # RBAC/RLS harness (M0)
├── infra/supabase/                  # NEW: service-role client
└── modules/
    ├── identity/                    # NEW: auth, sessions, admin accounts
    ├── users/                       # NEW: profiles, prefs, consents
    ├── regions/                     # MODIFY: in-memory → Supabase-backed
    ├── breeds/                      # MODIFY: in-memory → Supabase-backed
    ├── audit/                       # NEW: emitter + repository
    ├── analytics/                   # NEW: capture service
    └── notifications/               # NEW: outbox, devices, drainer stub

apps/web/
├── app/[locale]/(auth)/             # sign-up, sign-in, verify, recover, profile
├── app/[locale]/(shell)/            # landing with locale switcher
├── features/auth/                   # forms, hooks, session views
├── features/profile/                # completion, prefs, consent
├── messages/en.json, ur.json        # M0 i18n
└── lib/auth/                        # Supabase browser client

packages/shared/src/
├── constants/                       # OTP, rate limits, roles, regions
└── types/                           # Profile, Region, Session, Consent types

packages/ui/                         # state primitives (M0)

supabase/migrations/
├── 20250701000000_m0_platform.sql   # harness tables if any; rate-limit doc only
├── 20250702000000_regions_breeds.sql
└── 20250703000000_identity_m1.sql   # profiles, sessions, audit, analytics, outbox, etc.
```

**Structure Decision**: Web-application monorepo. M0 cross-cutting lives in `common/` and
CI; M1 adds seven domain modules following the established layout. Existing `regions` and
`breeds` scaffolds are upgraded from in-memory to Supabase-backed repositories in this
feature. Web uses `[locale]` segment for dual geography + RTL from day one.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
