# Feature Specification: Payments & Trust

**Feature Branch**: `005-payments-trust`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Payments & trust: payment intents, bank-transfer proof, Easypaisa/JazzCash/Stripe
stubs, immutable ledger, protected-payment states, boosts/subscriptions stubs (M5)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [004-breeding-workflow](../004-breeding-workflow/spec.md)

## Scope

### In scope

- Payment intents for deposit, full fee, boost purchase, and subscription purposes.
- Bank-transfer proof upload with private storage and audited access.
- Provider webhook handling (signature-verified, idempotent) for Easypaisa, JazzCash, and Stripe
  **stubs** — no live merchant requirement for launch.
- Immutable financial ledger entries on confirmed payments.
- Protected-payment status integration with breeding-request workflow.
- Payout accounts and payout requests with admin approve/release.
- Admin manual reconciliation and refunds with reason codes.
- Boost orders linked to listings; subscription plans per region.
- Verification request submission and admin queue listing (approve/reject in M6).

### Out of scope

- Live Easypaisa/JazzCash/Stripe merchant onboarding (stubs + bank transfer are launch bar).
- Regulated escrow claims; ledger-state protected payments until legal clearance.
- Dispute resolution and verification approval workflows (M6).
- Multi-country tax automation.

## User Scenarios & Testing *(mandatory)*

This feature lets participants pay breeding fees safely, records money movement immutably, and
prepares monetization (boosts, subscriptions) with provider-ready stubs.

### User Story 1 - Pay breeding fee via bank transfer (Priority: P1)

After a breeding request is accepted, the payer uploads bank-transfer proof; an administrator
reconciles and the request advances to a paid/scheduled state.

**Why this priority**: Bank transfer is the Pakistan MVP payment path per scope lock.

**Independent Test**: Create payment intent for a request, upload proof, admin reconcile,
confirm ledger entries and request status update.

**Acceptance Scenarios**:

1. **Given** an accepted request requiring payment, **When** the payer creates an intent and
   uploads proof, **Then** proof is stored privately and access is audited.
2. **Given** pending proof, **When** admin reconciles, **Then** immutable ledger entries are
   created and payment status updates.
3. **Given** a client attempting to self-report payment success without reconciliation, **When**
   submitted, **Then** it is ignored (server-authoritative status only).

---

### User Story 2 - Provider stub webhook (Priority: P1)

A stub provider sends a signed webhook; the system deduplicates and confirms payment idempotently.

**Why this priority**: Provider-ready architecture must be proven before live merchant swap.

**Independent Test**: Send duplicate webhooks with same idempotency key; confirm single ledger
effect.

**Acceptance Scenarios**:

1. **Given** a valid signed webhook, **When** received, **Then** payment intent transitions to
   confirmed and ledger entries are written once.
2. **Given** a replayed webhook event, **When** received, **Then** no duplicate ledger entries
   are created.
3. **Given** an invalid signature, **When** received, **Then** it is rejected.

---

### User Story 3 - Request protected-payment states (Priority: P1)

Breeding requests enter and leave `PaymentPending` consistent with payment confirmation.

**Why this priority**: Money and workflow state must stay aligned for trust.

**Independent Test**: Accept request requiring deposit → `PaymentPending` → confirm payment →
`Scheduled`.

**Acceptance Scenarios**:

1. **Given** a deposit-required request, **When** accepted, **Then** status becomes
   `PaymentPending` until confirmation.
2. **Given** confirmed payment, **When** processed, **Then** request advances per transition map.

---

### User Story 4 - Boost and subscription stubs (Priority: P2)

A breeder purchases a listing boost or subscribes to a regional plan using the same payment
rails (stub or bank transfer).

**Why this priority**: Monetization supports supply growth; stubs match launch bar.

**Independent Test**: Purchase boost with idempotent intent; confirm boost window on listing.

**Acceptance Scenarios**:

1. **Given** an owned active listing, **When** the owner purchases a boost with idempotent
   request, **Then** a boost order and payment intent are created without duplicates on retry.
2. **Given** regional plans, **When** a user subscribes, **Then** subscription status is tracked
   and cancel-at-period-end is supported.

---

### User Story 5 - Payout to breeder (Priority: P2)

A breeder registers a payout account and requests payout after completed paid breeding;
administrator approves release.

**Why this priority**: Completes the financial loop for supply-side participants.

**Independent Test**: Complete paid breeding, create payout, admin approve, confirm ledger
payout entries and audit.

**Acceptance Scenarios**:

1. **Given** a payee with ledger balance, **When** they request payout with idempotency key,
   **Then** payout is pending until admin approval.
2. **Given** pending payout, **When** admin approves, **Then** ledger records release and action
   is audited.

---

### User Story 6 - Submit verification request (Priority: P3)

A user submits a verification request by dimension; administrators see it in a pending queue.

**Why this priority**: Bridges passive M2 badges to M6 approval workflows.

**Independent Test**: Submit verification request; confirm queue listing (approval in M6).

**Acceptance Scenarios**:

1. **Given** an owned animal, **When** the owner submits media verification request, **Then**
   it appears in admin pending queue with dimension labeled.

### Edge Cases

- Duplicate idempotency key on intent creation → returns existing intent.
- Refund without reason code → rejected.
- Ledger rows are never updated or deleted by application roles.
- US Stripe stub follows same webhook dedup rules as PK stubs.
- Payout approval by non-admin → forbidden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST create payment intents with purpose, amount, currency, payer,
  payee, and idempotency keys.
- **FR-002**: Client-reported payment success MUST NEVER be trusted; only reconciliation or
  verified webhooks change confirmed status.
- **FR-003**: Webhooks MUST verify signatures, deduplicate via event store, and be idempotent.
- **FR-004**: Every confirmed payment MUST create balanced immutable ledger entries.
- **FR-005**: Users MUST upload bank-transfer proofs via private storage; proof access MUST be
  audited.
- **FR-006**: Administrators MUST reconcile and refund payments; refunds MUST include reason
  codes and ledger entries.
- **FR-007**: Breeding requests MUST integrate `PaymentPending` and post-payment transitions.
- **FR-008**: Boost purchases MUST be idempotent and affect listing visibility for a defined
  window.
- **FR-009**: Subscription plans MUST be listed per region; subscribe and cancel-at-period-end
  MUST be supported.
- **FR-010**: Payees MUST register payout accounts; payouts MUST require admin approval before
  release.
- **FR-011**: Users MUST submit verification requests by dimension; admins MUST list pending
  queue items (approval in M6).
- **FR-012**: Payment, reconciliation, refund, and payout actions MUST emit audit events.

### Key Entities

- **Payment Intent**: Payable unit with status, purpose, provider reference, idempotency key.
- **Webhook Event**: Deduplicated provider callback record.
- **Ledger Entry**: Immutable financial line tied to intents, refunds, payouts.
- **Payout / Payout Account**: Payee destination and withdrawal request.
- **Boost Order**: Paid visibility promotion for a listing.
- **Subscription**: User plan enrollment with period boundaries.
- **Verification Request**: Pending trust review item by dimension.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: End-to-end bank-transfer flow completes in staging from intent to reconciled
  ledger in under one business-day simulated path.
- **SC-002**: 100% of duplicate webhook replays produce zero duplicate ledger entries in tests.
- **SC-003**: 100% of refund operations without reason codes are rejected in tests.
- **SC-004**: Ledger immutability tests confirm update/delete are denied at database level.
- **SC-005**: Boost purchase retries with the same idempotency key create exactly one order.

## Assumptions

- Scope lock: stubs only for Easypaisa, JazzCash, Stripe — no live merchant onboarding required.
- Legal review applies before marketing "escrow"; ledger-state protected payments until cleared.
- M4 breeding workflow provides request states; M6 completes verification approval.
- PK and US regions use respective currencies from M1 region config.
