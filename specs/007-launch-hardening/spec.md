# Feature Specification: Launch Hardening

**Feature Branch**: `007-launch-hardening`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Launch hardening: RBAC/state-transition coverage, security review, performance,
observability, DR/webhook replay, retention policy, beta instrumentation (M7)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [006-trust-admin](../006-trust-admin/spec.md)

## Scope

### In scope

- Comprehensive automated test coverage for RBAC, ownership, breeding state transitions, ledger
  consistency, and audit-event presence.
- Documented data-retention periods per data class and right-to-erasure flow within legal limits.
- Security checklist completion (RLS review, signed-URL expiry, CORS, webhook signatures, secret
  isolation, analytics PII scrubbing).
- Performance validation for search and critical endpoints under seed load.
- Observability: logs, metrics, alerts for payment failures, error rates, auth/storage outages,
  suspicious admin activity.
- Disaster recovery: backup restore test, webhook replay idempotency test, full breeding smoke.
- Beta funnel instrumentation and launch liquidity seed data verification.

### Out of scope

- New product features or user-facing workflows.
- Native mobile apps.
- Multi-region production deployment beyond PK + US staging validation.
- Live payment merchant go-live (can proceed in parallel but not required for this milestone exit).

## User Scenarios & Testing *(mandatory)*

This feature makes the full MVP production-ready: tested, observable, recoverable, and
compliant with documented retention and security standards.

### User Story 1 - Confidence in role and state tests (Priority: P1)

Engineering and QA can run a single test suite that proves every role-gated action and breeding
payment state transition is covered.

**Why this priority**: Constitution and Agent.md require state-transition and RBAC tests before
release.

**Independent Test**: CI runs full matrix; failures block merge; coverage report lists all
critical paths green.

**Acceptance Scenarios**:

1. **Given** the full module set, **When** CI runs, **Then** role-matrix and state-transition
   tests pass for breeding, payments, and verification.
2. **Given** a missing audit event on a privileged action, **When** tested, **Then** the test
   fails.

---

### User Story 2 - Retention and erasure (Priority: P1)

Operations documents how long each data class is kept; users can request erasure within legal
limits without destroying financial/audit immutability.

**Why this priority**: Launch blocker per constitution and Rule.md.

**Independent Test**: Execute erasure on a test account; confirm PII redacted/soft-deleted while
ledger and audit rows remain as required.

**Acceptance Scenarios**:

1. **Given** published retention policy, **When** reviewed, **Then** every data class has a
   defined period.
2. **Given** erasure request, **When** processed, **Then** personal identifiers in mutable
   tables are redacted or soft-deleted per policy.
3. **Given** financial records, **When** erasure runs, **Then** immutable ledger and required
   audit entries are preserved.

---

### User Story 3 - Security checklist sign-off (Priority: P1)

Security review confirms RLS policies, signed URLs, webhook verification, and no service-role
exposure in the browser.

**Why this priority**: Marketplace handles money, health, and identity — security gaps are
existential.

**Independent Test**: Walk Setup.md security checklist; all items pass or have documented
exceptions with sign-off.

**Acceptance Scenarios**:

1. **Given** production configuration, **When** reviewed, **Then** service-role keys exist only
   on server environments.
2. **Given** expired signed URL, **When** accessed, **Then** access is denied.
3. **Given** analytics pipeline, **When** sampled, **Then** no private health or payment proof
   content is stored.

---

### User Story 4 - Observability and alerting (Priority: P2)

On-call operators receive alerts when payment webhooks fail, error rates spike, or suspicious
admin activity occurs.

**Why this priority**: Production operations require detectability before real users arrive.

**Independent Test**: Inject staged failure; confirm alert fires and runbook link is documented.

**Acceptance Scenarios**:

1. **Given** webhook processing failure, **When** threshold exceeded, **Then** alert notifies
   on-call channel.
2. **Given** dashboards, **When** viewed, **Then** golden signals (errors, latency, payment
   success) are visible.

---

### User Story 5 - Disaster recovery and smoke (Priority: P2)

Team restores backup to staging and replays webhooks without duplicate ledger effects; full
breeding journey smoke passes.

**Why this priority**: Validates recoverability and idempotency assumptions from M5.

**Independent Test**: Restore + replay test script; E2E smoke from sign-up to closed request with
record.

**Acceptance Scenarios**:

1. **Given** latest backup, **When** restored to staging, **Then** application boots and core
   queries succeed.
2. **Given** replayed webhook batch, **When** processed, **Then** ledger entry count matches
   original (no duplicates).
3. **Given** staging environment, **When** E2E smoke runs, **Then** PK and US paths complete
   without manual intervention.

---

### User Story 6 - Beta instrumentation (Priority: P3)

Product sees funnel events from signup through listing publish, request, payment, and
completion on dashboards.

**Why this priority**: Measures launch health and liquidity.

**Independent Test**: Run beta user script; confirm funnel events appear on analytics dashboard.

**Acceptance Scenarios**:

1. **Given** seed breeders and listings, **When** beta checklist runs, **Then** minimum liquidity
   thresholds documented in launch plan are met.
2. **Given** beta session, **When** completed, **Then** funnel events are visible without PII
   leakage.

### Edge Cases

- Erasure on account with open dispute → blocked or escalated per policy.
- Performance test on empty DB → invalid; must use seed load.
- Alert fatigue → thresholds documented and tuned.
- US path smoke may skip live card — stub/bank-transfer only per scope lock.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: CI MUST enforce role-gated and state-transition tests for all modules shipped in
  M1–M6; merges MUST fail when tests fail.
- **FR-002**: The project MUST publish data-retention periods per data class before production
  launch.
- **FR-003**: The system MUST support right-to-erasure within legal limits without breaking
  immutable ledger/audit requirements.
- **FR-004**: Security checklist in Setup.md MUST be satisfied or waived with documented
  product/legal sign-off.
- **FR-005**: Search and critical user journeys MUST meet documented latency targets under seed
  load.
- **FR-006**: Production MUST have logs, metrics, and alerts for payment webhooks, error rates,
  auth/storage health, and suspicious admin activity.
- **FR-007**: Team MUST successfully complete backup restore and webhook replay idempotency tests
  in staging.
- **FR-008**: End-to-end smoke MUST cover sign-up → animal → listing → request → payment
  (bank/stub) → record → review path for PK and US surfaces.
- **FR-009**: Beta instrumentation MUST capture funnel metrics without private health or
  identity payloads in analytics.
- **FR-010**: OpenAPI and migration CI gates from M1 MUST remain enforced.

### Key Entities

- **Retention Policy**: Document mapping data classes to retention periods and erasure behavior.
- **Test Matrix**: Role × action × state coverage artifact.
- **Alert Rule**: Threshold and notification channel for operational signals.
- **DR Runbook**: Steps for restore, replay, and smoke validation.
- **Launch Checklist**: Gate items for production readiness sign-off.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of defined critical RBAC and state-transition paths pass in CI on release
  branch.
- **SC-002**: Retention policy document covers 100% of named data classes in the architecture
  guide.
- **SC-003**: Security checklist completion rate is 100% or every waiver has written sign-off.
- **SC-004**: Search p95 perceived latency under seed load is under 2 seconds on target mobile
  profile.
- **SC-005**: Staged alert test delivers notification within 5 minutes.
- **SC-006**: Webhook replay test produces zero duplicate ledger entries.
- **SC-007**: E2E smoke passes for both PK and US staging paths.

## Assumptions

- All M1–M6 features are functionally complete before M7 entry.
- Observability tooling choices are documented in Setup.md (implementation in plan phase).
- Seed liquidity targets defined in MarketPlan/ImplementationPlan guide beta thresholds.
- Performance targets apply to seed-scale data, not hyperscale.
