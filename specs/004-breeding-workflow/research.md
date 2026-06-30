# Phase 0 Research: Breeding Workflow

Resolves M4 workflow, messaging, notifications, and dispute-opening choices.

## 1. Canonical breeding-request status enum in `@mating/shared`

- **Decision**: Publish `BREEDING_REQUEST_STATUS` and `BREEDING_REQUEST_TRANSITIONS` in
  `packages/shared/src/enums/breeding-request-status.ts` matching `doc/Features.md`:
  `Draft`, `Requested`, `Accepted`, `Rejected`, `PaymentPending`, `Scheduled`,
  `InProgress`, `Completed`, `RecordGenerated`, `Closed`, `Cancelled`, `Disputed`,
  `Refunded`. DB stores snake_case values (`requested`, `accepted`, …); API exposes
  PascalCase per product contract. Single transition map consumed by API guards, DTOs, and
  tests.
- **Rationale**: Resolves ImplementationPlan naming mismatch; Constitution IV requires
  stable enums across layers.
- **Alternatives considered**: DB-only enum without shared export (rejected: drift risk);
  shorter 5-state MVP (rejected: payment/dispute paths need PaymentPending/Disputed).

## 2. State machine enforcement

- **Decision**: `BreedingRequestStateMachine` in shared validates `(from, action) → to`;
  service methods call `assertTransition` before DB update; illegal transitions return
  `409 CONFLICT` with code `INVALID_STATE_TRANSITION`. Exhaustive unit tests for all
  allowed and denied edges from the Features.md diagram.
- **Rationale**: Spec FR-011/SC-002; central map prevents controller drift.
- **Alternatives considered**: Ad-hoc if/else per endpoint (rejected: untestable matrix);
  DB trigger-only enforcement (rejected: poor error messages, hard to test).

## 3. Append-only `breeding_request_events`

- **Decision**: Every status change inserts one row: `event_type`, `from_status`,
  `to_status`, `actor_id`, `metadata` (reason codes, schedule details). No UPDATE/DELETE
  grants for app roles. Parallel audit event `breeding_request.status_changed`.
- **Rationale**: Constitution I audibility; spec FR-004/SC-004.
- **Alternatives considered**: Audit log only without domain events table (rejected:
  workflow UI needs structured event stream); event sourcing full rebuild (rejected: YAGNI).

## 4. Idempotent breeding record generation

- **Decision**: `breeding_records.request_id` UNIQUE constraint. `POST
  /breeding-requests/:id/record` requires `Idempotency-Key` header; completion transition
  may auto-call generator once. Regeneration returns `200` with existing record (same body).
  Record captures animals, method, date, location, participants from request snapshot.
- **Rationale**: Constitution IV idempotency on record-generation; spec FR-005/SC-005.
- **Alternatives considered**: Allow multiple records per request (rejected: trust/audit);
  no idempotency key (rejected: retry-safe requirement).

## 5. Phone masking in messaging

- **Decision**: `PhoneMaskService` scans message `body` and attachment metadata for E.164 /
  local PK/US patterns; replaces with `[phone hidden]` until linked `breeding_requests.status`
  is `accepted` or `scheduled` (configurable via `regions.config.phoneRevealAfter` defaulting
  to `accepted_or_scheduled`). Masking applied on write (stored masked) and on read for
  pre-reveal states. Listing-linked chats without a request always mask.
- **Rationale**: Constitution III + Features.md; spec FR-007/SC-003.
- **Alternatives considered**: Mask only on read (rejected: DB leak if RLS misconfigured);
  reveal at `Requested` (rejected: anti-scam policy).

## 6. Disputes: open only (M6 resolution deferred)

- **Decision**: `POST /breeding-requests/:id/dispute` from eligible states
  (`payment_pending`, `scheduled`, `in_progress`, `completed`) creates `disputes` row
  `status=open`, moves request → `disputed`, emits `dispute_opened` audit/analytics. No
  resolve/assign endpoints in M4 (M6). Conversation may be frozen via `conversations.status =
  frozen`.
- **Rationale**: Spec scope: open only; resolution in M6.
- **Alternatives considered**: Inline dispute text only without table (rejected:
  IntegrationGuide schema); full resolution in M4 (rejected: out of scope).

## 7. Workflow notifications via M1 outbox

- **Decision**: On key transitions (`requested`, `accepted`, `rejected`, `scheduled`,
  `completed`, `disputed`), insert `outbox_messages` in the **same DB transaction** as the
  status update. Template keys `breeding.request_received`, etc. with en/ur lookup.
  Category `transactional` bypasses marketing opt-out per M1 prefs model.
- **Rationale**: Spec FR-009/US5; Constitution reliability note (outbox not fire-and-forget).
- **Alternatives considered**: Direct SMS call from service (rejected: no transactional
  guarantee); Realtime-only push (rejected: low-literacy SMS requirement).
