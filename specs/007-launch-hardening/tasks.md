# Tasks: Launch Hardening

**Input**: Design documents from `/specs/007-launch-hardening/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/launch-checklist.md, contracts/retention.md, quickstart.md

**Tests**: Consolidated coverage suites in `apps/api/test/coverage/`, security in `apps/api/test/security/`, performance in `apps/api/test/perf/`, DR in `apps/api/test/dr/` per plan.md deliverables.

**Organization**: Tasks grouped by user story for independent validation of each launch gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- API tests: `apps/api/test/coverage/`, `apps/api/test/security/`, `apps/api/test/perf/`, `apps/api/test/dr/`
- API source: `apps/api/src/`
- Web analytics: `apps/web/lib/analytics/`
- Migrations: `supabase/migrations/`
- Ops config: `docker/alerts/`, `doc/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test harness scaffolding, CI job wiring, and operational artifact directories

- [ ] T001 Create coverage test directory structure and `apps/api/test/coverage/manifest.json` skeleton per `data-model.md` §Test Matrix Manifest
- [ ] T002 [P] Create security test directory in `apps/api/test/security/` with shared fixtures in `apps/api/test/security/fixtures.ts`
- [ ] T003 [P] Create perf bench directory in `apps/api/test/perf/` with seed-load helper in `apps/api/test/perf/seed-load.ts`
- [ ] T004 [P] Create DR test directory in `apps/api/test/dr/` with staging credential loader in `apps/api/test/dr/staging-env.ts`
- [ ] T005 Add M7 CI jobs for coverage, security, perf, and DR suites in `.github/workflows/api-test.yml`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Operational tables, retention seed, and manifest population from M1–M6 inventories

**⚠️ CRITICAL**: No user story validation can begin until this phase is complete

- [ ] T006 Create M7 retention migration in `supabase/migrations/20250901000000_m7_retention.sql` for `retention_policies` and `erasure_requests` per `data-model.md`
- [ ] T007 Seed `retention_policies` rows from `contracts/retention.md` §Data classes in `supabase/seed.sql`
- [ ] T008 [P] Create `launch_checklist_signoffs` table in `supabase/migrations/20250901000001_launch_checklist.sql` per `data-model.md`
- [ ] T009 Populate full RBAC critical-path inventory in `apps/api/test/coverage/manifest.json` from M1–M6 module route lists per `data-model.md` §Critical path inventory
- [ ] T010 [P] Extend test harness helpers in `apps/api/test/harness/rbac.ts` and `apps/api/test/harness/state-transitions.ts` for manifest-driven assertions
- [ ] T011 Add manifest validation script in `apps/api/test/coverage/validate-manifest.ts` that fails CI on untested manifest entries

**Checkpoint**: Foundation ready — user story validation suites can now be built

---

## Phase 3: User Story 1 — Confidence in role and state tests (Priority: P1) 🎯 MVP

**Goal**: Single CI suite proves every role-gated action and breeding/payment state transition is covered (SC-001)

**Independent Test**: `pnpm --filter @mating/api test -- test/coverage` green; breaking a role guard fails `rbac.matrix.test.ts`

### Implementation for User Story 1

- [ ] T012 [P] [US1] Implement RBAC matrix test suite in `apps/api/test/coverage/rbac.matrix.test.ts` driven by `manifest.json` rbac entries
- [ ] T013 [P] [US1] Implement ownership cross-owner block tests in `apps/api/test/coverage/ownership.test.ts` per QA-01
- [ ] T014 [P] [US1] Implement state-transition test suite in `apps/api/test/coverage/state-transitions.test.ts` for breeding, payment, verification, account status
- [ ] T015 [P] [US1] Implement ledger consistency tests in `apps/api/test/coverage/ledger-consistency.test.ts` for balanced entries and idempotent webhook keys
- [ ] T016 [US1] Implement audit-event presence tests in `apps/api/test/coverage/audit-events.test.ts` asserting exactly one `audit_logs` row per privileged action
- [ ] T017 [US1] Wire coverage job as merge-blocking in `.github/workflows/api-test.yml` per `contracts/launch-checklist.md` QA-001–QA-004

**Checkpoint**: User Story 1 complete — 100% critical RBAC and state-transition paths green in CI

---

## Phase 4: User Story 2 — Retention and erasure (Priority: P1)

**Goal**: Published retention policy per data class and admin erasure flow preserving ledger/audit immutability (SC-002, FR-002, FR-003)

**Independent Test**: Erasure on test account redacts PII; ledger count unchanged; open dispute blocks with 409

### Tests for User Story 2

- [ ] T018 [P] [US2] Add erasure flow integration tests in `apps/api/test/users/erasure.test.ts` per `quickstart.md` §Erasure drill
- [ ] T019 [P] [US2] Add retention policy completeness test in `apps/api/test/users/retention-policy.test.ts` asserting all data classes from `contracts/retention.md` exist in `retention_policies`

### Implementation for User Story 2

- [ ] T020 [US2] Implement erasure service in `apps/api/src/modules/users/erasure.service.ts` with step-by-step redact/soft-delete per `contracts/retention.md`
- [ ] T021 [US2] Create erasure controller in `apps/api/src/modules/users/erasure.controller.ts` with `POST /api/v1/admin/users/:id/erasure` and `GET` status
- [ ] T022 [US2] Add open-dispute and pending-payout block guards in `apps/api/src/modules/users/erasure.service.ts` returning `ERASURE_BLOCKED_*` codes
- [ ] T023 [P] [US2] Implement scheduled purge jobs in `apps/api/src/modules/users/jobs/retention-purge.job.ts` per `contracts/retention.md` §Scheduled jobs
- [ ] T024 [US2] Link retention contract from `doc/Setup.md` with data-class summary table

**Checkpoint**: User Story 2 complete — retention published, erasure validated, ledger/audit preserved

---

## Phase 5: User Story 3 — Security checklist sign-off (Priority: P1)

**Goal**: Automated security checks pass in CI; manual items documented for sign-off (SC-003, FR-004)

**Independent Test**: `pnpm --filter @mating/api test -- test/security` green; `grep -r SUPABASE_SERVICE_ROLE apps/web` returns empty

### Implementation for User Story 3

- [ ] T025 [P] [US3] Implement RLS policy review tests in `apps/api/test/security/rls-review.test.ts` per `contracts/launch-checklist.md` SEC-002
- [ ] T026 [P] [US3] Implement signed URL expiry rejection tests in `apps/api/test/security/signed-url-expiry.test.ts` per SEC-003
- [ ] T027 [P] [US3] Implement CORS origin allowlist tests in `apps/api/test/security/cors.test.ts` per SEC-005
- [ ] T028 [P] [US3] Implement webhook signature rejection tests in `apps/api/test/security/webhook-signature.test.ts` for all stub providers per SEC-004
- [ ] T029 [US3] Add service-role grep CI guard in `apps/api/test/security/service-role-exposure.test.ts` per SEC-001
- [ ] T030 [US3] Create manual security walkthrough doc in `doc/SecurityChecklist.md` linking `contracts/launch-checklist.md` SEC-006, SEC-007 items

**Checkpoint**: User Story 3 complete — automated security suite green; manual checklist ready for sign-off

---

## Phase 6: User Story 4 — Observability and alerting (Priority: P2)

**Goal**: Logs, metrics, dashboards, and alerts for payment failures, error rates, and suspicious admin activity (SC-005, FR-006)

**Independent Test**: Inject staged webhook failure in staging; on-call notification within 5 minutes

### Implementation for User Story 4

- [ ] T031 [P] [US4] Implement structured JSON logger in `apps/api/src/common/observability/structured-logger.ts` with request/auth/webhook/admin categories
- [ ] T032 [P] [US4] Add metrics hooks in `apps/api/src/common/observability/metrics.service.ts` for 4xx/5xx, webhook success, search latency, upload failures
- [ ] T033 [US4] Define alert rules in `docker/alerts/payment-webhook-failure.yml` per `research.md` §5 threshold table
- [ ] T034 [P] [US4] Define alert rules in `docker/alerts/api-error-rate.yml` and `docker/alerts/suspicious-admin.yml`
- [ ] T035 [US4] Document alert runbook links and dashboard URLs in `doc/Setup.md` §Alerts per OBS-001, OBS-002
- [ ] T036 [US4] Add observability validation script in `apps/api/test/observability/alert-drill.test.ts` for staged failure notification timing

**Checkpoint**: User Story 4 complete — golden signals visible; alert drill passes within 5 minutes

---

## Phase 7: User Story 5 — Disaster recovery and smoke (Priority: P2)

**Goal**: Backup restore, webhook replay idempotency, and full breeding E2E smoke for PK and US (SC-006, SC-007, FR-007, FR-008)

**Independent Test**: Webhook double-replay produces zero duplicate ledger entries; breeding smoke completes both regions unattended

### Implementation for User Story 5

- [ ] T037 [P] [US5] Implement backup restore validation test in `apps/api/test/dr/restore.test.ts` per `quickstart.md` §DR Restore
- [ ] T038 [P] [US5] Implement webhook replay idempotency test in `apps/api/test/dr/webhook-replay.test.ts` with captured stub provider batches
- [ ] T039 [US5] Implement E2E breeding smoke orchestration in `apps/api/test/dr/breeding-smoke.test.ts` for PK phone-OTP and US email/stub paths
- [ ] T040 [US5] Add DR runbook section to `quickstart.md` §DR Restore with RTO/RPO targets from `research.md` §6
- [ ] T041 [US5] Configure nightly DR job for staging in `.github/workflows/dr-nightly.yml` per `quickstart.md` CI gate summary

**Checkpoint**: User Story 5 complete — restore boots app; replay idempotent; PK + US smoke green

---

## Phase 8: User Story 6 — Beta instrumentation (Priority: P3)

**Goal**: Funnel events from signup through completion on dashboards without PII; launch liquidity seed thresholds met (FR-009)

**Independent Test**: Beta user script produces funnel events on PostHog with allowlisted properties only; seed counts meet LIQ-001 minimums

### Implementation for User Story 6

- [ ] T042 [P] [US6] Implement privacy-filtered funnel helpers in `apps/web/lib/analytics/funnel.ts` with property allowlist per `research.md` §9
- [ ] T043 [US6] Extend launch liquidity seed data in `supabase/seed.sql` to meet `contracts/launch-checklist.md` §LIQ-001 PK and US minimums
- [ ] T044 [P] [US6] Add funnel event allowlist unit tests in `apps/api/test/analytics/funnel-privacy.test.ts` asserting no phone/email/health/payment-proof properties
- [ ] T045 [US6] Add seed liquidity count validation test in `apps/api/test/dr/seed-liquidity.test.ts` comparing counts to LIQ-001 thresholds

**Checkpoint**: User Story 6 complete — funnel instrumented; liquidity seed verified

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Launch checklist sign-off, performance benches, docs, and final gate validation

- [ ] T046 [P] Implement search latency benchmark in `apps/api/test/perf/search.bench.ts` asserting p95 < 2000 ms under seed load (SC-004)
- [ ] T047 [P] Implement critical endpoint benchmarks in `apps/api/test/perf/critical-endpoints.bench.ts` asserting p95 < 800 ms API-only
- [ ] T048 Wire perf bench job on release branch in `.github/workflows/api-test.yml` per PERF-001, PERF-002
- [ ] T049 Run full `quickstart.md` validation scenarios for US1–US6 and record DR restore date in `contracts/launch-checklist.md` sign-off table
- [ ] T050 Verify OpenAPI and migration CI gates remain enforced per `contracts/launch-checklist.md` CI-001 (FR-010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–8)**: All depend on Foundational
  - US1, US2, US3 (P1) are launch blockers — complete before P2/P3 stories
  - US4, US5 (P2) can run in parallel after P1 stories
  - US6 (P3) can run after seed data exists (T043)
- **Polish (Phase 9)**: Depends on all P0 checklist items having passing tests or documented waivers

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — requires M1–M6 modules functionally complete
- **User Story 2 (P1)**: Can start after T006–T007 (retention migration/seed)
- **User Story 3 (P1)**: Can start after Foundational — independent of US1/US2
- **User Story 4 (P2)**: Can start after Foundational — benefits from US1 audit tests existing
- **User Story 5 (P2)**: Depends on M5 webhook idempotency; uses seed data from T043 for smoke
- **User Story 6 (P3)**: Depends on T043 seed extension; analytics privacy tests independent

### Within Each User Story

- Test suites before or alongside implementation; CI wiring after suites exist
- Retention migration before erasure service
- Alert rules before alert drill validation
- Seed liquidity before liquidity count test

### Parallel Opportunities

- T002, T003, T004 (test directories) in parallel
- T012–T015 (coverage suites) in parallel after manifest populated
- T025–T028 (security suites) in parallel
- T031, T032, T034 (observability) in parallel
- T037, T038 (DR tests) in parallel
- T046, T047 (perf benches) in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all coverage suites together after manifest is populated:
Task T012: rbac.matrix.test.ts
Task T013: ownership.test.ts
Task T014: state-transitions.test.ts
Task T015: ledger-consistency.test.ts
# Then wire audit-events (T016) which may reference actions from other suites
```

---

## Implementation Strategy

### MVP First (P1 Gate — User Stories 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (coverage suites)
4. Complete Phase 4: User Story 2 (retention + erasure)
5. Complete Phase 5: User Story 3 (security checklist)
6. **STOP and VALIDATE**: P0 items QA-001–SEC-007 from `contracts/launch-checklist.md`

### Incremental Delivery

1. Setup + Foundational → operational tables and manifest ready
2. US1 → CI coverage gate live
3. US2 → retention published; erasure drill passes
4. US3 → security automation green; manual sign-off doc ready
5. US4 → observability and alerts operational
6. US5 → DR restore + replay + smoke documented
7. US6 → funnel + liquidity verified
8. Polish → perf benches and final launch sign-off

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: User Story 1 (coverage suites + CI)
- Developer B: User Story 2 (erasure) + User Story 3 (security tests)
- Developer C: User Story 4 (observability) + User Story 5 (DR/smoke)
- Developer D: User Story 6 (funnel + seed) + Polish perf benches

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- M7 adds no new user-facing product features — operational hardening only
- US E2E smoke uses bank-transfer/stub payment only — no live card
- Immutable `audit_logs` and `ledger_entries` exempt from erasure
- Waivers require `launch_checklist_signoffs` row with product + legal sign-off per `contracts/launch-checklist.md`
- Performance tests invalid on empty DB — must use `SEED_LOAD=1` per `quickstart.md`
