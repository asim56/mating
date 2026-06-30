# Phase 0 Research: Launch Hardening (M7)

Resolves operational unknowns for production readiness. Each item: Decision / Rationale /
Alternatives considered. References `doc/Setup.md`, `doc/ExecutionBacklog.md`, and constitution
retention/consent requirements.

## 1. Consolidated test coverage strategy (QA-01)

- **Decision**: Extend the M0 harness (`apps/api/test/harness/rbac.ts`,
  `state-transitions.ts`) with five consolidated suites under `apps/api/test/coverage/`:
  `rbac.matrix.test.ts` (role × route), `ownership.test.ts` (cross-owner RLS blocks),
  `state-transitions.test.ts` (breeding, payment, verification, account status),
  `ledger-consistency.test.ts` (balanced entries, idempotent webhook effects),
  `audit-events.test.ts` (privileged action → exactly one `audit_logs` row). CI runs all on
  every PR; release branch requires 100% green on the defined critical-path manifest in
  `data-model.md` §Test Matrix Manifest.
- **Rationale**: Constitution VI and `Agent.md` require RBAC + state-transition tests before
  release; per-milestone inline tests exist but M7 needs a single enforceable gate (SC-001).
- **Alternatives considered**: Code-coverage percentage only (rejected: does not prove critical
  paths); manual QA spreadsheet (rejected: not CI-enforceable).

## 2. Data retention periods per data class (QA-02)

- **Decision**: Publish retention in `contracts/retention.md` with a reference table seeded into
  `retention_policies`. Periods below are MVP defaults; legal review may extend financial/audit
  holds before production.

  | Data class | Examples | Retention | Erasure behavior |
  | --- | --- | --- | --- |
  | `identity_credentials` | `auth.users`, OTP metadata | Life of account + 30 days post-erasure | Supabase Auth delete; no local copy |
  | `profile_pii` | `profiles` name, phone, email, address | Life of account | Redact to placeholders on erasure |
  | `session_telemetry` | `sessions`, device descriptors | 90 days after last activity | Hard delete expired rows; redact on erasure |
  | `consent_preferences` | `consents`, `notification_preferences` | Life of account + 7 years (PECA/TCPA evidence) | Anonymize subject link; retain consent record |
  | `animal_listing` | `animals`, `listings`, public media | Life of record + 2 years after soft-delete | Soft-delete; storage objects deleted after 90-day grace |
  | `health_clinical` | `health_records`, vet notes | Life of animal + 7 years | Redact free-text; retain structured vaccination dates if legally required |
  | `messaging` | `conversations`, `messages` | 2 years after request closed | Soft-delete body; retain metadata for disputes |
  | `breeding_workflow` | `breeding_requests`, events, records | 7 years after close | Anonymize participant PII; retain record facts |
  | `payment_financial` | `payment_intents`, proofs, `ledger_entries` | 7 years (tax/audit) | **No delete**; redact proof file paths; ledger immutable |
  | `audit_immutable` | `audit_logs` | 7 years minimum | **No delete**; actor PII may be pseudonymized |
  | `analytics_product` | `analytics_events`, PostHog | 13 months | Aggregated only; no raw PII per privacy filter |
  | `support_operations` | dispute notes, moderation queue | 3 years after resolution | Redact reporter PII |

- **Rationale**: Constitution and `Rule.md` require defined retention before launch; table
  balances PK/US expectations and financial immutability (FR-002, FR-003).
- **Alternatives considered**: Document-only policy with no DB reference (rejected: erasure
  service needs machine-readable rules); single global TTL (rejected: financial/audit classes
  have longer legal holds).

## 3. Right-to-erasure flow (QA-02)

- **Decision**: Admin-initiated `POST /api/v1/admin/users/:id/erasure` (documented in
  `contracts/retention.md`) creates an `erasure_requests` row, blocks if open dispute exists,
  then: (1) redacts `profiles` PII fields, (2) soft-deletes user-owned animals/listings with
  grace period, (3) redacts message bodies, (4) revokes all sessions + Supabase Auth delete,
  (5) preserves `ledger_entries`, `audit_logs`, and breeding record facts with pseudonymized
  actor IDs. Each step emits audit events.
- **Rationale**: GDPR-style erasure within legal limits; financial immutability non-negotiable
  (constitution I, spec edge case: open dispute blocks erasure).
- **Alternatives considered**: User self-service erasure button at launch (deferred: admin-only
  reduces abuse risk for MVP); hard-delete all rows (rejected: breaks ledger integrity).

## 4. Performance validation approach (SEC-02)

- **Decision**: Run benchmarks against **seed-loaded** staging DB (`supabase db reset` + extended
  `seed.sql`). Targets:
  - Search (`GET /api/v1/listings/search`): p95 < **2000 ms** (SC-004), mobile profile simulated
    via 3G latency injection optional.
  - Critical endpoints: `GET /api/v1/listings/:id`, `POST /api/v1/breeding-requests`,
    `GET /api/v1/me`, `POST /api/v1/payments/intents`: p95 < **800 ms** API-only.
  - Upload failure rate < **1%** under concurrent 10-upload test.
  Bench harness: `apps/api/test/perf/*.bench.ts` using `node --test` with warmup + 100 iterations;
  fails CI if thresholds exceeded on seed data.
- **Rationale**: Spec explicitly invalidates empty-DB perf tests; seed scale matches MVP launch.
- **Alternatives considered**: k6 load test at hyperscale (rejected: YAGNI, out of MVP scope);
  manual Lighthouse only (rejected: not API-search focused).

## 5. Observability and alerting (OBS-01)

- **Decision**: Use existing stack per `doc/Setup.md`:
  - **Logs**: Structured JSON via NestJS logger → host log drain; categories: request, auth
    failure, webhook, admin action, RLS/service-role usage.
  - **Metrics**: API 4xx/5xx rate, webhook success/failure, search latency histogram, DB query
    duration, upload failures, notification delivery failures — exported via host-compatible
    format (Prometheus-style counters or provider-native).
  - **Alerts** (initial thresholds, tune in staging):
    | Signal | Threshold | Channel |
    | --- | --- | --- |
    | Payment webhook failure rate | >5% over 5 min | On-call Slack/PagerDuty |
    | API 5xx rate | >2% over 5 min | On-call |
    | Auth failure spike | >50/min per region | Security channel |
    | DB connection errors | Any sustained 1 min | On-call |
    | Storage upload failure | >10% over 10 min | On-call |
    | Suspicious admin | >20 privileged actions/hour by single actor | Security channel |
  - **Staged failure test**: Inject failing webhook signature in staging; expect alert within
    **5 minutes** (SC-005).
- **Rationale**: Setup.md already names Sentry + PostHog; alerts cover spec FR-006 signals.
- **Alternatives considered**: Full Datadog stack (rejected: new vendor/cost at MVP); alert on
  every 4xx (rejected: alert fatigue per spec edge case).

## 6. Disaster recovery: backup restore (DR-01)

- **Decision**: Quarterly (minimum: once before launch) restore Supabase daily backup into an
  isolated **staging** project. Runbook steps in `quickstart.md` §DR Restore:
  1. Create fresh staging project or reset from backup snapshot.
  2. Apply pending migrations if backup predates HEAD.
  3. Verify `GET /api/v1/health` → 200 with DB ready.
  4. Spot-check: list regions, count `ledger_entries`, auth sign-in smoke.
  RTO target: **4 hours**; RPO: **24 hours** (daily backup).
- **Rationale**: Setup.md requires restore test before launch; Supabase PITR available on
  production tier upgrade.
- **Alternatives considered**: Cross-region replica (rejected: out of scope per spec); manual
  pg_dump only (rejected: does not validate Supabase Auth/Storage linkage).

## 7. Webhook replay idempotency test (DR-01)

- **Decision**: `apps/api/test/dr/webhook-replay.test.ts` replays a captured batch of stub
  provider webhooks (Easypaisa, JazzCash, Stripe stubs) twice against the same `payment_intent`
  ids. Assert: ledger entry count unchanged on second pass; `payment_intents.status` stable;
  idempotency keys honored (SC-006).
- **Rationale**: M5 established idempotent webhooks; M7 proves recoverability assumption.
- **Alternatives considered**: Production replay only (rejected: unsafe); skip replay test
  (rejected: FR-007).

## 8. E2E smoke: PK + US paths (DR-01, FR-008)

- **Decision**: `apps/api/test/dr/breeding-smoke.test.ts` (API-level orchestration; optional
  Playwright supplement for web) executes:
  - **PK path**: phone-OTP sign-up → create animal → publish listing → submit request →
    bank-transfer proof → admin reconcile → record generated → review submitted.
  - **US path**: email/password sign-up → same workflow with US region + stub/Stripe webhook
    (no live card).
  Both paths run unattended against staging; US skips live card per scope lock.
- **Rationale**: SC-007 requires both geographies; API-level smoke is faster to maintain in CI
  staging gate.
- **Alternatives considered**: Manual QA only (rejected: not repeatable); PK-only smoke
  (rejected: dual geography requirement).

## 9. Beta funnel instrumentation (DR-02, FR-009)

- **Decision**: Instrument funnel events via existing `analytics_events` + PostHog (privacy
  filter enforced):
  `signup_completed` → `profile_completed` → `animal_created` → `listing_published` →
  `request_submitted` → `payment_initiated` → `payment_confirmed` → `request_completed` →
  `review_submitted`.
  Properties: `region`, `species`, `role`, `listing_id` (uuid), `request_id` (uuid) — **no**
  phone, email, health text, or payment-proof content.
  Web helper: `apps/web/lib/analytics/funnel.ts` wraps capture with allowlist.
- **Rationale**: FR-009 + constitution III analytics privacy rules.
- **Alternatives considered**: Full session replay (rejected: PII risk); custom warehouse
  (rejected: YAGNI).

## 10. Launch liquidity seed thresholds (DR-02)

- **Decision**: Extended `supabase/seed.sql` must meet **staging/beta minimums** (not long-term
  MarketPlan SOM targets):
  - **PK**: ≥10 verified breeder accounts, ≥30 active listings across cattle/buffalo/goat/sheep/dog,
    ≥5 listings per priority species.
  - **US**: ≥5 verified breeder accounts, ≥15 active listings, ≥3 dog listings.
  - Each region: at least 1 completed breeding-request record in seed history for funnel
    dashboard sanity.
- **Rationale**: Beta needs discoverable supply without seeding thousands of rows; thresholds
  documented in `contracts/launch-checklist.md` §Liquidity.
- **Alternatives considered**: Empty launch (rejected: cold-start failure); 2,000 breeders in
  seed (rejected: unrealistic for staging).

## 11. Security checklist execution model (SEC-01)

- **Decision**: Split checklist into:
  - **Automated** (CI): RLS policy existence tests, signed-URL expiry rejection, CORS origin
    allowlist, webhook signature rejection, grep guard for `SUPABASE_SERVICE_ROLE` in `apps/web`.
  - **Manual** (sign-off): Sentry `beforeSend` PII scrub review, PostHog property allowlist,
    production env var audit, admin RBAC spot-check.
  Waivers require written product + legal sign-off row in `launch_checklist_signoffs` (see
  `data-model.md`).
- **Rationale**: SC-003 allows waivers with sign-off; automation catches regressions.
- **Alternatives considered**: Manual-only checklist (rejected: does not block merge regressions).
