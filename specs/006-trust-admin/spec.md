# Feature Specification: Trust & Admin

**Feature Branch**: `006-trust-admin`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Trust & admin: vet/inspector verification queues, disputes, reviews/reputation,
moderation, audit explorer, admin dashboards (M6)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [005-payments-trust](../005-payments-trust/spec.md)

## Scope

### In scope

- Verification approve/reject workflows with role-scoped actions (vet: health only; inspector:
  evidence only; admin: all dimensions).
- Dispute assignment, investigation, and resolution with reason/resolution codes; refund trigger
  via payments module.
- Post-completion reviews (one per reviewer per request) with moderation and reputation surfacing.
- Content moderation: listing/animal suspension, message reports, welfare/fraud escalation.
- Admin audit log explorer with filtered queries.
- Business analytics dashboards (revenue, funnel, disputes, verification throughput).
- Field Onboarding Rep scoped support actions with attribution audit.

### Out of scope

- Launch hardening, retention policy finalization, DR tests (M7).
- Native mobile admin apps.
- Automated AI content moderation.

## User Scenarios & Testing *(mandatory)*

This feature operationalizes trust — verification, disputes, reviews, and admin tooling — so
the marketplace can respond to abuse and reward good actors.

### User Story 1 - Approve animal verification (Priority: P1)

An administrator or authorized vet/inspector reviews a pending verification request and
approves or rejects a specific dimension, updating visible badge status.

**Why this priority**: Active verification closes the loop started in M2 passive badges.

**Independent Test**: Approve health verification as vet; confirm only health dimension updates
and audit event fires.

**Acceptance Scenarios**:

1. **Given** a pending health verification, **When** a veterinarian approves, **Then** the
   health dimension shows approved with explicit label (not generic "verified").
2. **Given** an inspector role, **When** they attempt health approval, **Then** it is refused.
3. **Given** admin rejection, **When** recorded, **Then** dimension stays unverified/rejected
   with audit trail.

---

### User Story 2 - Resolve a dispute (Priority: P1)

Support assigns and resolves a dispute opened in M4, optionally triggering refund per policy.

**Why this priority**: Disputes are inevitable in breeding transactions; unresolved disputes
destroy trust.

**Independent Test**: Assign dispute, resolve with resolution code, confirm request state and
optional refund intent.

**Acceptance Scenarios**:

1. **Given** an open dispute, **When** support assigns themselves, **Then** assignment is
   recorded.
2. **Given** investigation complete, **When** support resolves with code, **Then** dispute
   closes, request moves per resolution (e.g., `Refunded` or `Closed`), and action is audited.
3. **Given** resolution requires refund, **When** triggered, **Then** payments module receives
   refund with reason code.

---

### User Story 3 - Leave a review after breeding (Priority: P2)

A participant submits a star rating and comment after an eligible completed request; reputation
updates reflect moderation and dispute flags.

**Why this priority**: Reputation steers demand toward quality breeders.

**Independent Test**: Submit review post-completion; attempt duplicate → rejected; admin hide →
excluded from public reputation.

**Acceptance Scenarios**:

1. **Given** a completed closed request, **When** a participant reviews within policy window,
   **Then** one review per reviewer is stored.
2. **Given** a dispute-influenced review, **When** surfaced, **Then** it is flagged until support
   review per policy.
3. **Given** admin hides a review, **When** reputation is calculated, **Then** hidden review is
   excluded.

---

### User Story 4 - Moderate harmful listings (Priority: P2)

Support suspends a listing for fraud, cruelty, or disease risk; exotic listings require category
approval per region config.

**Why this priority**: Welfare and fraud response are constitution-mandated.

**Independent Test**: Suspend listing as support; confirm immediate removal from public search
and audit entry.

**Acceptance Scenarios**:

1. **Given** a reported listing, **When** support suspends it, **Then** it is removed from
   public discovery immediately.
2. **Given** exotic species listing in PK, **When** category approval not granted, **Then**
   publish or continued visibility is blocked.

---

### User Story 5 - Audit explorer and dashboards (Priority: P2)

An administrator searches audit logs and views business dashboards for launch operations.

**Why this priority**: Operators need observability into trust and revenue health.

**Independent Test**: Query audit by actor and action; view dashboard metrics under seed load.

**Acceptance Scenarios**:

1. **Given** admin access, **When** filtering audit logs by action type, **Then** matching
   immutable entries are returned with cursor pagination.
2. **Given** dashboard access, **When** viewed, **Then** metrics include active breeders,
   search-to-request conversion, completion rate, dispute rate, and verification throughput.
3. **Given** admin views sensitive evidence document, **When** accessed, **Then** access is
   audited.

### Edge Cases

- Double review by same reviewer on same request → rejected.
- Resolve dispute already closed → rejected.
- Support agent attempts payout approval → forbidden.
- Field rep attempts payment action → forbidden (scoped support only).
- Reputation calculation excludes suspended users' hidden reviews.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Administrators MUST approve or reject verification requests; vets MUST only act on
  health dimensions; inspectors MUST only act on evidence dimensions.
- **FR-002**: Approval MUST update explicit per-dimension status and emit `verification_approved`
  or rejection audit events.
- **FR-003**: Support MUST assign, investigate, and resolve disputes with reason and resolution
  codes.
- **FR-004**: Dispute resolution MAY trigger refunds through the payments module with reason
  codes.
- **FR-005**: Participants MUST submit one review per request after eligibility rules; edits
  allowed within a defined window only.
- **FR-006**: Administrators MUST moderate reviews (approve/hide); hidden reviews MUST be
  excluded from public reputation.
- **FR-007**: Support MUST suspend listings and animals for policy violations; actions MUST be
  audited immediately.
- **FR-008**: Administrators MUST search audit logs by actor, subject, action, and time range.
- **FR-009**: Dashboards MUST surface operational metrics without exposing private health or
  payment proof content.
- **FR-010**: Field Onboarding Rep actions MUST be attributed and audited; reps MUST NOT access
  payments, payouts, or dispute resolution.
- **FR-011**: All admin document access MUST emit audit events.

### Key Entities

- **Verification Decision**: Approval/rejection for one dimension on a subject.
- **Dispute Case**: Assigned support ticket with status, reason, and resolution.
- **Review**: Rating and comment tied to a completed request with moderation state.
- **Reputation Summary**: Derived trust signals weighting verification and completion.
- **Moderation Action**: Suspension or approval affecting listings, animals, or messages.
- **Audit Query Result**: Filtered view over immutable audit log entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Verification approval updates only the intended dimension in 100% of RBAC tests.
- **SC-002**: Dispute resolution paths (refund vs close) produce correct request terminal states
  in end-to-end tests.
- **SC-003**: Duplicate review submission success rate is 0% in automated tests.
- **SC-004**: Suspended listings disappear from public search within one minute in tests.
- **SC-005**: Admin audit queries return paginated results without exposing raw PII beyond
  policy in sampled security review.

## Assumptions

- M5 provides payment refunds, verification queue listing, and ledger integration.
- M4 provides open disputes and completed requests eligible for review.
- Reputation algorithm weights verification and completion over raw stars per Features.md.
- Retention periods for audit/reviews finalized in M7 but explorer must work with interim policy.
