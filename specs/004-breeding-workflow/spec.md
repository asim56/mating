# Feature Specification: Breeding Workflow

**Feature Branch**: `004-breeding-workflow`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Breeding workflow: canonical request lifecycle, events, breeding records, messaging
with phone masking, workflow notifications (M4)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [002-animal-supply](../002-animal-supply/spec.md), [003-discovery](../003-discovery/spec.md)

## Scope

### In scope

- Canonical breeding-request status model and guarded transitions.
- Request creation with eligibility and business-rule validation.
- Event log for every status change.
- Breeding record generation on completion (idempotent).
- Dispute opening (resolution in M6).
- Conversations and messages tied to requests or listings.
- Phone-number masking until request reaches accepted/scheduled (or regional policy).
- Message reporting and support visibility.
- Workflow notifications via M1 outbox (localized en/ur).

### Out of scope

- Payment collection and protected-payment states (M5).
- Dispute resolution, refunds, and reputation moderation (M6).
- Reviews (M6).
- Native video calling.

## User Scenarios & Testing *(mandatory)*

This feature connects supply and demand through a trusted breeding request workflow with
communication and auditable state changes.

### User Story 1 - Submit and respond to a breeding request (Priority: P1)

An animal owner finds a listing and submits a breeding request with proposed date, location
preference, and notes; the recipient accepts or rejects.

**Why this priority**: The request lifecycle is the core transaction funnel of the marketplace.

**Independent Test**: Create a request against an active listing, accept as recipient, confirm
status transitions and event log entries.

**Acceptance Scenarios**:

1. **Given** an active listing, **When** a qualified owner submits a request, **Then** status
   becomes `Requested` and the recipient is notified.
2. **Given** a pending request, **When** the recipient accepts, **Then** status becomes
   `Accepted` and the action is audited.
3. **Given** invalid eligibility (same animal, inactive account, wrong sex for natural mating),
   **When** submit is attempted, **Then** it is rejected with a clear reason.

---

### User Story 2 - Schedule and complete breeding (Priority: P1)

Parties move an accepted request through schedule, in-progress, and completion, generating a
breeding record.

**Why this priority**: Completion and records drive repeat usage and trust outcomes.

**Independent Test**: Walk a request through `Scheduled` → `InProgress` → `Completed` →
`RecordGenerated` → `Closed`; confirm exactly one breeding record exists.

**Acceptance Scenarios**:

1. **Given** an accepted request, **When** schedule is confirmed, **Then** status becomes
   `Scheduled`.
2. **Given** a completed breeding, **When** completion is confirmed per policy, **Then** a
   breeding record is generated once with animals, method, date, location, and participants.
3. **Given** a duplicate record generation attempt, **When** retried, **Then** the operation
   is idempotent (no duplicate records).

---

### User Story 3 - Masked messaging (Priority: P1)

Request participants exchange messages; phone numbers remain hidden until the request is
accepted or scheduled.

**Why this priority**: Privacy and anti-scam protection are constitution-mandated.

**Independent Test**: Send messages before and after acceptance; verify phone masking behavior
changes only at the permitted transition.

**Acceptance Scenarios**:

1. **Given** a request in `Requested` state, **When** participants message, **Then** phone
   numbers in content or metadata are masked.
2. **Given** a request in `Accepted` or `Scheduled`, **When** participants message, **Then**
   phone reveal follows regional policy (default: revealed at accepted/scheduled).
3. **Given** a non-participant, **When** they attempt to read the conversation, **Then**
   access is refused.

---

### User Story 4 - Open a dispute (Priority: P2)

A participant opens a dispute with a reason code when something goes wrong mid-workflow.

**Why this priority**: Dispute opening must exist before M6 resolution and payment refunds.

**Independent Test**: Open dispute from an eligible state; confirm request moves to `Disputed`
and dispute record is created.

**Acceptance Scenarios**:

1. **Given** a request in a disputable state, **When** a participant opens a dispute with a
   valid reason code, **Then** status becomes `Disputed` and `dispute_opened` is emitted.
2. **Given** an illegal state, **When** dispute is attempted, **Then** it is rejected.

---

### User Story 5 - Workflow notifications (Priority: P2)

Participants receive localized notifications on key transitions (request received, accepted,
scheduled, completed) respecting notification preferences.

**Why this priority**: Low-literacy users rely on SMS/push for time-sensitive breeding
coordination.

**Independent Test**: Trigger accept transition; confirm outbox entry created and transactional
categories delivered even if marketing is opted out.

**Acceptance Scenarios**:

1. **Given** a request accepted, **When** the transition commits, **Then** an outbox message is
   written in the same transaction.
2. **Given** a user who disabled non-transactional notifications, **When** a transactional
   breeding event occurs, **Then** notification still delivers.

### Edge Cases

- Illegal state transition (e.g., `Rejected` → `Scheduled`) → rejected with stable error code.
- Self-mating attempt (unless record-only method) → rejected.
- Cancelled request → messaging read-only or frozen per policy.
- Reported message → visible to support; conversation may be frozen during dispute.
- Suspended participant → cannot create or advance requests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST implement the canonical breeding-request status enum and
  transition map (`Draft` through `Refunded`).
- **FR-002**: Qualified users MUST create breeding requests against active listings with
  validation for active accounts, active animals, supported breeding methods, and region
  eligibility.
- **FR-003**: Only the recipient MAY accept or reject; only authorized roles MAY perform each
  transition per RBAC.
- **FR-004**: Every status change MUST append an immutable event to the request event log and
  emit an audit event.
- **FR-005**: Completing a request MUST generate exactly one breeding record per request
  (idempotent regeneration).
- **FR-006**: Participants MUST exchange messages in request- or listing-linked conversations
  with pagination and signed URL attachments.
- **FR-007**: Phone numbers MUST be masked in messaging until the linked request reaches
  `Accepted` or `Scheduled` (unless regional config overrides).
- **FR-008**: Users MUST report messages; support MUST be able to view reports and freeze
  conversations during disputes.
- **FR-009**: Key workflow transitions MUST enqueue localized notifications via the
  transactional outbox respecting user preferences.
- **FR-010**: Participants MUST open disputes with reason codes from eligible states; resolution
  is deferred to M6.
- **FR-011**: Illegal transitions MUST be rejected; state-transition tests MUST cover all
  allowed and denied paths.

### Key Entities

- **Breeding Request**: Stateful agreement between requester and recipient with animals, method,
  schedule, and payment placeholder.
- **Breeding Request Event**: Append-only log entry for each transition.
- **Breeding Record**: Post-completion immutable summary for repeat usage and audits.
- **Dispute**: Open case linked to a request with reason code (resolution in M6).
- **Conversation / Message**: Thread between participants with masking and attachment rules.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A request can traverse from `Requested` to `Closed` with a generated record in
  end-to-end staging tests.
- **SC-002**: 100% of illegal transitions are rejected in automated state-machine tests.
- **SC-003**: 100% of tested pre-acceptance messages mask phone numbers.
- **SC-004**: Every status transition produces both an event-log row and an audit entry in tests.
- **SC-005**: Record generation is idempotent — repeated completion calls create zero duplicate
  records in tests.

## Assumptions

- M1 outbox and notification preferences exist; M3 active listings exist.
- Payment pending (`PaymentPending`) state is entered but collection mechanics are M5.
- Dispute resolution, refunds, and reviews are M6.
- Supported methods: natural, artificial insemination, semen purchase, record-only.
