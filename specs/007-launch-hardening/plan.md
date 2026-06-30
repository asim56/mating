# Implementation Plan: Launch Hardening (M7)

**Branch**: `007-launch-hardening` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-launch-hardening/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**:
[006-trust-admin](../006-trust-admin/spec.md) (M1–M6 functionally complete)

## Summary

Deliver **Checkpoint 5 / M7**: production-readiness hardening across the full MVP module set.
No new user-facing product features — this milestone consolidates **RBAC/state-transition test
coverage**, **documented retention + right-to-erasure**, **security checklist sign-off**,
**performance validation under seed load**, **observability and alerts**, **DR restore +
webhook replay idempotency**, **E2E smoke (PK + US)**, and **beta funnel instrumentation +
launch liquidity seed verification**.

Operational contracts live in `contracts/`; validation runbooks in `quickstart.md`. Retention
periods and erasure behavior are codified in `contracts/retention.md` and backed by minimal
operational tables (`retention_policies`, `erasure_requests`) defined in `data-model.md`.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: Existing stack — NestJS guards/harness (`apps/api/test/harness/`),
Supabase PostgreSQL + Storage + Auth, Sentry (API errors), PostHog (product analytics),
Vercel Analytics (web), `node --test` + `tsx` for API tests, Playwright or API-level smoke
scripts for E2E (see `research.md` §8).

**Storage**: Supabase PostgreSQL (all M1–M6 business tables); Supabase Storage (media,
payment proofs); operational additions: `retention_policies` (reference/config), `erasure_requests`
(workflow audit). No new domain business tables.

**Testing**: Consolidated coverage suites under `apps/api/test/coverage/`; security suites under
`apps/api/test/security/`; performance benches under `apps/api/test/perf/`; DR suites under
`apps/api/test/dr/`; CI gates unchanged (migration validation, OpenAPI drift, unit/integration).

**Target Platform**: Linux long-running API host + Vercel (web) + Supabase (DB/Auth/Storage);
staging PK + US environments for smoke and DR validation.

**Project Type**: Web application monorepo — operational hardening layer on existing modules.

**Performance Goals**: Search and critical journey endpoints p95 < **2 seconds** on target mobile
profile under **seed load** (SC-004); not valid on empty DB.

**Constraints**: US E2E smoke uses bank-transfer/stub payment only (no live card); immutable
`audit_logs` and `ledger_entries` exempt from erasure; service-role key server-only; analytics
must not carry private health, payment-proof, or identity-document payloads (FR-009).

**Scale/Scope**: MVP launch scale — seed data (~50–200 accounts, ~100 listings); consolidated
test matrix covering M1–M6 modules; ~10 alert rules; one DR runbook cycle before production.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Consolidated audit-event tests verify every privileged action from M1–M6 emits immutable audit rows; erasure preserves ledger/audit immutability. | PASS |
| II. Animal Welfare, Legality & Regional Compliance | E2E smoke validates PK + US regional paths; retention policy documents legal holds for financial/audit records. | PASS |
| III. Security & Privacy by Default | Security checklist (RLS, signed URLs, CORS, webhooks, secret isolation, analytics scrubbing) enforced via automated + manual gates; erasure redacts PII in mutable tables. | PASS |
| IV. Type-Safe, Versioned API Contracts | OpenAPI + migration CI gates remain enforced (FR-010); no new public API surface except `POST /admin/users/:id/erasure` (admin-only, documented in retention contract). | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | Observability uses existing Sentry/PostHog; no new queue/search infra; alert rules as config/YAML; perf benches reuse seed DB. | PASS |
| VI. Quality Gates & Definition of Done | M7 is the release gate: RBAC/state-transition/ledger/audit coverage, retention docs, security sign-off, perf under seed, DR smoke — all CI- or runbook-gated. | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — operational contracts
and data model complete; ready for `/speckit-tasks`.

## M7 Deliverables

| Area | ID | Deliverable | Acceptance |
| --- | --- | --- | --- |
| QA | QA-01 | Consolidated RBAC, ownership, state-transition, ledger-consistency, audit-event test suites | 100% of critical paths green in CI (SC-001); split per concern under `apps/api/test/coverage/` |
| Compliance | QA-02 | Retention policy publication + erasure flow | `contracts/retention.md` + `retention_policies` seed; erasure redacts PII, preserves ledger/audit (SC-002) |
| Security | SEC-01 | Security checklist automation + sign-off | `contracts/launch-checklist.md` §Security; RLS/signed-URL/CORS/webhook/secret tests pass (SC-003) |
| Performance | SEC-02 | Seed-load latency benchmarks | Search p95 < 2s; critical endpoints documented in `research.md` §4 |
| Observability | OBS-01 | Logs, metrics, alerts per `doc/Setup.md` | Dashboards live; staged failure alert within 5 min (SC-005) |
| DR | DR-01 | Restore + webhook replay + breeding smoke | Zero duplicate ledger on replay (SC-006); E2E smoke PK + US (SC-007) |
| Launch | DR-02 | Seed liquidity + beta funnel instrumentation | Seed thresholds met; funnel events on dashboard without PII |

## Project Structure

### Documentation (this feature)

```text
specs/007-launch-hardening/
├── plan.md                    # This file
├── research.md                # Phase 0 — tooling/threshold decisions
├── data-model.md              # Phase 1 — operational tables + artifacts
├── quickstart.md              # Phase 1 — validation runbooks
├── contracts/
│   ├── launch-checklist.md    # Production readiness gate contract
│   └── retention.md           # Data-class retention + erasure contract
├── checklists/
│   └── requirements.md        # Spec-quality checklist (existing)
└── tasks.md                   # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
apps/api/
├── src/
│   ├── common/observability/          # NEW: structured logger, metrics hooks
│   └── modules/users/
│       ├── erasure.controller.ts      # NEW: admin erasure endpoint
│       └── erasure.service.ts         # NEW: redact/soft-delete per retention contract
└── test/
    ├── harness/                       # EXISTING: rbac.ts, state-transitions.ts
    ├── coverage/                      # NEW: consolidated M7 suites
    │   ├── rbac.matrix.test.ts
    │   ├── ownership.test.ts
    │   ├── state-transitions.test.ts
    │   ├── ledger-consistency.test.ts
    │   └── audit-events.test.ts
    ├── security/                      # NEW: SEC-01 automated checks
    │   ├── rls-review.test.ts
    │   ├── signed-url-expiry.test.ts
    │   ├── cors.test.ts
    │   └── webhook-signature.test.ts
    ├── perf/                          # NEW: SEC-02 benchmarks
    │   ├── search.bench.ts
    │   └── critical-endpoints.bench.ts
    └── dr/                            # NEW: DR-01 runbook tests
        ├── restore.test.ts
        ├── webhook-replay.test.ts
        └── breeding-smoke.test.ts

apps/web/
└── lib/analytics/
    └── funnel.ts                      # NEW: beta funnel event helpers (privacy-filtered)

supabase/
├── migrations/
│   └── 20250901000000_m7_retention.sql  # retention_policies + erasure_requests
└── seed.sql                           # EXTEND: launch liquidity seed data

doc/
├── Setup.md                           # EDIT: retention table, alert runbook links
└── SecurityChecklist.md               # NEW: detailed SEC-01 walkthrough (links launch contract)

docker/alerts/                         # NEW: alert rule definitions (OBS-01)
```

**Structure Decision**: Operational hardening extends existing test harness and adds thin
observability/erasure modules. No new domain features. Contracts and runbooks are the primary
M7 artifacts; implementation files listed above are targets for `/speckit-tasks`.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
