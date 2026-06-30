# Quickstart & Validation: Launch Hardening (M7)

Operational validation runbooks for production readiness. This is **not** a user-facing feature
guide — it proves gate items in `contracts/launch-checklist.md` and acceptance scenarios in
`spec.md`.

Implementation targets: `plan.md`. Retention details: `contracts/retention.md`. Test manifest:
`data-model.md`.

## Prerequisites

- M1–M6 merged; staging environments for **PK** and **US** configured.
- Node >=22, pnpm >=9, Supabase CLI, Docker.
- Staging secrets: API host, Supabase service role (server only), Sentry DSN, PostHog key.
- On-call channel configured for alert drill (Slack webhook or PagerDuty test integration).
- Latest `supabase/seed.sql` with launch liquidity data applied.

## Setup

```bash
pnpm install
supabase start                                    # local DR dev
supabase db reset                                 # migrations + seed
pnpm --filter @mating/api test                     # full API test suite
pnpm --filter @mating/api test -- test/coverage    # M7 consolidated coverage
pnpm --filter @mating/api test -- test/security    # SEC-01 automated checks
pnpm --filter @mating/api test -- test/dr          # DR suites (staging credentials)
```

For performance benches (requires seed load):

```bash
SEED_LOAD=1 pnpm --filter @mating/api test -- test/perf
```

---

## Validation scenarios (map to spec user stories)

### US1 — RBAC and state-transition confidence (P1)

**Goal**: SC-001 — critical paths green in CI.

1. Run `pnpm --filter @mating/api test -- test/coverage`.
2. Confirm `manifest.json` has no untested entries (script or manual diff).
3. Intentionally break a role guard locally → CI fails on `rbac.matrix.test.ts`.
4. Intentionally allow illegal breeding transition → `state-transitions.test.ts` fails.

**Pass**: All coverage suites green; audit test fails when emitter removed.

### US2 — Retention and erasure (P1)

**Goal**: SC-002, FR-002, FR-003.

#### Policy review

1. Open `contracts/retention.md` — every data class from `data-model.md` §mapping present.
2. Query `SELECT data_class, retention_period, erasure_mode FROM retention_policies ORDER BY 1`.
3. Confirm `doc/Setup.md` links to this contract.

#### Erasure drill (staging)

1. Create test account with profile, animal, listing, completed payment (ledger entries exist).
2. `POST /api/v1/admin/users/:id/erasure` as `super_admin` with `{ "reason": "qa drill" }`.
3. Verify:
   - `profiles` PII redacted
   - `ledger_entries` count **unchanged**
   - `audit_logs` rows exist; `actor_id` pseudonymized for subject's actions
   - Auth sign-in for subject fails
4. Repeat with account that has **open dispute** → expect `409 ERASURE_BLOCKED_OPEN_DISPUTE`.

**Pass**: Erasure scenarios 1–3 from spec; dispute edge case blocked.

### US3 — Security checklist sign-off (P1)

**Goal**: SC-003, FR-004.

```bash
pnpm --filter @mating/api test -- test/security
grep -r SUPABASE_SERVICE_ROLE apps/web   # must return empty
```

Manual (document in `doc/SecurityChecklist.md`):

1. Production env audit — service role only on API host.
2. Request expired signed URL for health record → denied.
3. POST webhook with bad signature → `401`/`403`.
4. Sample PostHog + Sentry events — no PII payloads.

**Pass**: Automated suite green; manual checklist signed.

### US4 — Observability and alerting (P2)

**Goal**: SC-005, FR-006.

#### Dashboard check

1. Open observability dashboards — confirm visible: API 4xx/5xx, webhook success rate, search
   latency, auth failures.
2. Trigger synthetic traffic; metrics update within 2 minutes.

#### Alert drill

1. In staging, configure webhook endpoint to return 500 for 6 minutes OR use test hook in
   `docker/alerts/`.
2. Confirm on-call notification within **5 minutes**.
3. Document alert → runbook link in incident channel.

**Pass**: Alert received; dashboards show golden signals.

### US5 — Disaster recovery and smoke (P2)

**Goal**: SC-006, SC-007, FR-007, FR-008.

#### DR Restore

1. Take note of latest Supabase backup timestamp (staging or production snapshot copy).
2. Create isolated staging restore from backup (Supabase dashboard → restore to new project OR
   `pg_restore` from export).
3. Point API staging env at restored DB; run migrations if needed.
4. `curl -s $API_URL/api/v1/health | jq` → `status: ok`, database ready.
5. Spot-check: `GET /api/v1/regions`, count `ledger_entries`, sign-in smoke.

**Pass**: Application boots; core queries succeed (spec scenario 1).

#### Webhook replay

```bash
pnpm --filter @mating/api test -- test/dr/webhook-replay.test.ts
```

Record ledger count before/after double replay — must be identical.

**Pass**: SC-006 zero duplicates.

#### E2E breeding smoke

```bash
STAGING_API_URL=https://... STAGING_PK=1 STAGING_US=1 \
  pnpm --filter @mating/api test -- test/dr/breeding-smoke.test.ts
```

Paths:

- **PK**: phone-OTP → animal → listing → request → bank proof → admin reconcile → record → review
- **US**: email sign-up → same flow with stub payment (no live card)

**Pass**: Both regions complete without manual intervention (SC-007).

### US6 — Beta instrumentation (P3)

**Goal**: FR-009, liquidity thresholds.

#### Liquidity counts

After `supabase db reset`:

```sql
-- PK verified breeders
SELECT count(*) FROM profiles p
JOIN user_roles ur ON ur.account_id = p.id
WHERE p.region_code = 'PK' AND ur.role = 'breeder';

-- Active listings per region
SELECT region_code, count(*) FROM listings
WHERE status = 'active' AND deleted_at IS NULL
GROUP BY region_code;
```

Compare to `contracts/launch-checklist.md` §LIQ-001 minimums.

#### Funnel drill

1. Run scripted beta session (signup → listing publish → request → payment → complete).
2. Open PostHog funnel dashboard — events in order without PII properties.
3. Confirm `analytics_events` rows match allowlist (`region`, `species`, uuid ids only).

**Pass**: Liquidity thresholds met; funnel visible without PII leakage.

---

## CI gate summary

| Job | Path | Blocks merge |
| --- | --- | --- |
| Coverage | `test/coverage/*` | Yes |
| Security | `test/security/*` | Yes |
| Perf (release branch) | `test/perf/*` | Yes on `main` / release |
| DR (nightly staging) | `test/dr/*` | Yes before production tag |
| Migration + OpenAPI | existing CI | Yes (FR-010) |

---

## Done checks

- [ ] `contracts/launch-checklist.md` P0 items passed or waived with sign-off
- [ ] `contracts/retention.md` published and seeded
- [ ] Alert drill completed within 5 minutes
- [ ] DR restore + webhook replay + E2E smoke documented with dates
- [ ] PK + US smoke green
- [ ] Beta funnel + liquidity verified on staging
- [ ] `doc/Setup.md` and `doc/SecurityChecklist.md` updated

M7 exit → production-ready per `doc/Setup.md` checkpoint.
