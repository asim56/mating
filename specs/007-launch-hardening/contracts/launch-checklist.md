# Contract: Production Launch Checklist

Gate contract for M7 exit and production readiness. Each item has an `id`, verification method,
and owner. Status tracked in release process; waivers recorded in `launch_checklist_signoffs`
(see `data-model.md`).

**Exit criterion**: All **P0** items `passed` or `waived` with written sign-off. **P1** items
required before first real-user traffic.

References: `doc/Setup.md`, `research.md`, `quickstart.md`.

---

## P0 — Blockers

### QA-001 — RBAC matrix coverage

- **Verify**: CI job `coverage` runs `apps/api/test/coverage/rbac.matrix.test.ts`; manifest
  `apps/api/test/coverage/manifest.json` has zero untested `rbac` entries.
- **Pass**: SC-001 — 100% critical role-gated paths green on release branch.
- **Owner**: Engineering

### QA-002 — State-transition coverage

- **Verify**: `state-transitions.test.ts` covers breeding, payment, verification, account
  status per manifest.
- **Pass**: All allowed transitions succeed; all forbidden transitions return stable error codes.
- **Owner**: Engineering

### QA-003 — Audit event presence

- **Verify**: `audit-events.test.ts` — every privileged action in manifest emits exactly one
  `audit_logs` row; DB rejects UPDATE/DELETE on `audit_logs`.
- **Pass**: No missing audit events on critical paths.
- **Owner**: Engineering

### QA-004 — Ledger consistency

- **Verify**: `ledger-consistency.test.ts` — balanced entries on confirm; refund reason required;
  webhook replay produces zero duplicate entries.
- **Pass**: SC-006 satisfied in automated test.
- **Owner**: Engineering

### RET-001 — Retention policy published

- **Verify**: `contracts/retention.md` complete; `retention_policies` table seeded; `doc/Setup.md`
  links to contract.
- **Pass**: SC-002 — 100% named data classes covered.
- **Owner**: Product + Legal

### RET-002 — Erasure flow validated

- **Verify**: Execute erasure on test account per `quickstart.md` §Erasure; ledger and audit
  rows preserved; PII redacted.
- **Pass**: FR-003 acceptance scenarios met.
- **Owner**: Engineering + Legal

### SEC-001 — Service role isolation

- **Verify**: `grep -r SUPABASE_SERVICE_ROLE apps/web` returns zero; env audit on production
  shows key only on API host.
- **Pass**: No browser exposure.
- **Owner**: Security

### SEC-002 — RLS enabled

- **Verify**: `apps/api/test/security/rls-review.test.ts` — RLS on all user-owned/sensitive
  tables; cross-owner read blocked.
- **Pass**: Automated suite green.
- **Owner**: Engineering

### SEC-003 — Signed URL expiry

- **Verify**: `signed-url-expiry.test.ts` — expired URL returns 403/404; valid URL works.
- **Pass**: Automated suite green.
- **Owner**: Engineering

### SEC-004 — Webhook signatures

- **Verify**: `webhook-signature.test.ts` — invalid signature rejected; valid accepted.
- **Pass**: All payment providers (stub) covered.
- **Owner**: Engineering

### SEC-005 — CORS restricted

- **Verify**: `cors.test.ts` — disallowed origins blocked on API.
- **Pass**: Only configured web origins allowed.
- **Owner**: Engineering

### SEC-006 — Analytics PII scrubbing

- **Verify**: Sample `analytics_events` + PostHog events contain no phone, email, health text,
  payment-proof content, or identity documents.
- **Pass**: Privacy filter unit tests green.
- **Owner**: Engineering + Product

### SEC-007 — Sentry PII scrubbing

- **Verify**: Manual review of `beforeSend` config; trigger test error — no PII in Sentry event.
- **Pass**: Documented in `doc/SecurityChecklist.md`.
- **Owner**: Engineering

### OBS-001 — Alerts configured

- **Verify**: Alert rules in `docker/alerts/` deployed; staged failure test per `quickstart.md`
  §Alert drill.
- **Pass**: SC-005 — notification within 5 minutes.
- **Owner**: DevOps

### OBS-002 — Dashboards live

- **Verify**: Golden signals visible — API errors, latency, payment webhook success, search
  latency.
- **Pass**: On-call can access dashboards without manual queries.
- **Owner**: DevOps

### DR-001 — Backup restore test

- **Verify**: Restore latest backup to staging per `quickstart.md` §DR Restore; health + spot
  checks pass.
- **Pass**: FR-007 restore leg complete.
- **Owner**: DevOps

### DR-002 — Webhook replay idempotency

- **Verify**: `apps/api/test/dr/webhook-replay.test.ts` green in staging.
- **Pass**: SC-006.
- **Owner**: Engineering

### DR-003 — E2E smoke PK + US

- **Verify**: `apps/api/test/dr/breeding-smoke.test.ts` — both regions unattended.
- **Pass**: SC-007; US uses bank/stub only.
- **Owner**: Engineering + QA

### CI-001 — Migration + OpenAPI gates

- **Verify**: CI migration validation and OpenAPI drift jobs pass on release branch.
- **Pass**: FR-010.
- **Owner**: Engineering

---

## P1 — Pre-traffic

### PERF-001 — Search latency under seed load

- **Verify**: `apps/api/test/perf/search.bench.ts` — p95 < 2000 ms on seed DB.
- **Pass**: SC-004.
- **Owner**: Engineering

### PERF-002 — Critical endpoint latency

- **Verify**: `critical-endpoints.bench.ts` — p95 < 800 ms API-only.
- **Owner**: Engineering

### LIQ-001 — Launch liquidity seed

- **Verify**: Counts after `supabase db reset` on staging seed:

  | Region | Metric | Minimum |
  | --- | --- | --- |
  | PK | Verified breeder accounts | 10 |
  | PK | Active listings | 30 |
  | PK | Listings per priority species (cattle, buffalo, goat, sheep, dog) | 5 each |
  | US | Verified breeder accounts | 5 |
  | US | Active listings | 15 |
  | US | Dog listings | 3 |
  | Both | Completed request in seed history | ≥1 |

- **Owner**: Product + Engineering

### BETA-001 — Funnel instrumentation

- **Verify**: Run beta user script (`quickstart.md` §Beta funnel); events appear on PostHog
  dashboard with allowlisted properties only.
- **Pass**: FR-009.
- **Owner**: Product

### DOC-001 — Setup.md updated

- **Verify**: Retention table, alert runbook links, DR steps cross-linked.
- **Owner**: Engineering

---

## Waiver process

1. Item cannot pass before launch deadline.
2. Product + Legal (security items: + Engineering lead) document risk in `waiver_rationale`.
3. Insert row in `launch_checklist_signoffs` with `status = 'waived'`.
4. Remediation ticket created with target date.

SC-003: 100% completion OR every waiver has written sign-off.

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering lead | | | |
| Product | | | |
| Security | | | |
| Legal (retention/erasure) | | | |
| DevOps / on-call | | | |
