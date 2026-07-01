# Tasks: Payments & Trust

**Input**: Design documents from `/specs/005-payments-trust/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Idempotency (intents, webhooks, boosts, payouts), ledger immutability, and refund-without-reason rejection tests are **required** per spec SC-002/SC-003/SC-004/SC-005.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US6)
- Include exact file paths in descriptions

## Path Conventions

- API: `apps/api/src/modules/`
- Shared: `packages/shared/src/`
- Config: `packages/config/src/`
- Migrations: `supabase/migrations/`
- Tests: `apps/api/test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Module registration, env config, and test harness

- [X] T001 Register `PaymentsModule` and `WalletLedgerModule` imports in `apps/api/src/app.module.ts`
- [X] T002 [P] Add `PAYMENT_STUB_SECRET` validation in `packages/config/src/env.ts`
- [X] T003 [P] Create payment test fixtures (payer, payee, breeding request) in `apps/api/test/payments/fixtures.ts`
- [X] T004 [P] Re-export payment enums and `PaymentProvider` from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrations, shared enums, provider interface, ledger writer — **MUST complete before user stories**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `supabase/migrations/20250901000000_payment_intents_webhook_events.sql` per `data-model.md`
- [X] T006 Create `supabase/migrations/20250901000100_subscription_plans_subscriptions.sql` with regional plan seed data
- [X] T007 Create `supabase/migrations/20250901000200_boost_orders.sql`
- [X] T008 Create `supabase/migrations/20250901000300_ledger_entries.sql` with UPDATE/DELETE revoked for app roles
- [X] T009 Create `supabase/migrations/20250901000400_payout_accounts_payouts.sql`
- [X] T010 [P] Add `PaymentIntentStatus`, `PaymentPurpose`, `PaymentProviderCode` enums in `packages/shared/src/enums/payment-status.ts` and `packages/shared/src/enums/payment-provider.ts`
- [X] T011 [P] Add `LedgerAccountType`, `LedgerEntryType`, `RefundReasonCode`, `PAYMENT_PROOF_BUCKET` in `packages/shared/src/enums/ledger.ts`
- [X] T012 [P] Confirm `PaymentProvider` interface surface in `packages/shared/src/integrations/index.ts` matches adapter needs
- [X] T013 Write ledger UPDATE/DELETE denied DB test in `apps/api/test/wallet-ledger/ledger-immutability.test.ts`
- [X] T014 Scaffold `PaymentsModule` in `apps/api/src/modules/payments/payments.module.ts`
- [X] T015 [P] Scaffold `WalletLedgerModule` in `apps/api/src/modules/wallet-ledger/wallet-ledger.module.ts`
- [X] T016 [P] Implement `PaymentsRepository` for intents and webhook_events in `apps/api/src/modules/payments/payments.repository.ts`
- [X] T017 Implement balanced double-entry `LedgerWriterService` in `apps/api/src/modules/wallet-ledger/ledger-writer.service.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Pay breeding fee via bank transfer (Priority: P1) 🎯 MVP

**Goal**: Payer creates intent, uploads proof privately; admin reconciles; ledger entries written; breeding request advances.

**Independent Test**: Intent → proof → reconcile → `confirmed` ledger rows; client cannot self-confirm (FR-002).

### Tests for User Story 1

- [X] T018 [P] [US1] Bank transfer flow contract test in `apps/api/test/payments/bank-transfer.test.ts`
- [X] T019 [P] [US1] Client-reported success ignored test (no confirm endpoint) in `apps/api/test/payments/payment-authority.test.ts`

### Implementation for User Story 1

- [X] T020 [P] [US1] Create payment intent DTOs in `apps/api/src/modules/payments/dto/`
- [X] T021 [US1] Implement idempotent intent create (duplicate key returns existing) in `apps/api/src/modules/payments/payments.service.ts`
- [X] T022 [US1] Wire `POST/GET /payments/intents` routes in `apps/api/src/modules/payments/payments.controller.ts`
- [X] T023 [US1] Implement proof upload-url and attach proof in `apps/api/src/modules/payments/proof.controller.ts`
- [X] T024 [US1] Implement admin reconcile with ledger write in `apps/api/src/modules/wallet-ledger/admin-payments.controller.ts`
- [X] T025 [US1] Emit audit `payment.intent_created`, `payment.proof_uploaded`, `payment.reconciled` in service layer
- [X] T026 [US1] Hook reconcile → breeding request `PaymentPending` → `Scheduled` in `apps/api/src/modules/payments/events/payment-confirmed.handler.ts`

**Checkpoint**: User Story 1 independently testable

---

## Phase 4: User Story 2 - Provider stub webhook (Priority: P1)

**Goal**: Signed webhook confirms intent idempotently; replays produce zero duplicate ledger rows.

**Independent Test**: Valid webhook → processed; replay same `eventId` → duplicate_ignored; bad signature → 401.

### Tests for User Story 2

- [X] T027 [P] [US2] Webhook dedup idempotency test (SC-002) in `apps/api/test/payments/webhook-dedup.test.ts`
- [X] T028 [P] [US2] Invalid signature rejection test in `apps/api/test/payments/webhook-signature.test.ts`

### Implementation for User Story 2

- [X] T029 [P] [US2] Implement `easypaisa.stub.ts` HMAC verify in `apps/api/src/modules/payments/providers/easypaisa.stub.ts`
- [X] T030 [P] [US2] Implement `jazzcash.stub.ts` and `stripe.stub.ts` in `apps/api/src/modules/payments/providers/`
- [X] T031 [US2] Implement `bank-transfer.adapter.ts` and `PaymentProviderFactory` in `apps/api/src/modules/payments/providers/payment-provider.factory.ts`
- [X] T032 [US2] Wire `POST /payments/:provider/webhook` in `apps/api/src/modules/payments/webhook.controller.ts`
- [X] T033 [US2] Process webhook in same transaction (webhook_events + intent confirm + ledger) in `apps/api/src/modules/payments/payments.service.ts`
- [X] T034 [US2] Invoke breeding-request transition on linked intent confirm in `apps/api/src/modules/payments/events/payment-confirmed.handler.ts`

**Checkpoint**: User Stories 1 and 2 independently testable

---

## Phase 5: User Story 3 - Request protected-payment states (Priority: P1)

**Goal**: Accept with fee requirement → `PaymentPending`; confirmed payment → `Scheduled` per M4 transition map.

**Independent Test**: Deposit-required accept → `PaymentPending`; confirm → `Scheduled`; illegal skip rejected.

### Tests for User Story 3

- [X] T035 [P] [US3] Breeding payment state integration test in `apps/api/test/payments/breeding-payment-states.test.ts`

### Implementation for User Story 3

- [X] T036 [US3] Auto-transition to `PaymentPending` on accept when deposit/full fee required in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T037 [US3] Store `payment_intent_id` on request metadata during intent creation in `apps/api/src/modules/payments/payments.service.ts`
- [X] T038 [US3] Reject illegal `PaymentPending` → `Completed` without confirmed payment in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T039 [US3] Create breeding-fee intent on accept when policy requires payment in `apps/api/src/modules/payments/payments.service.ts`

**Checkpoint**: User Stories 1–3 independently testable

---

## Phase 6: User Story 4 - Boost and subscription stubs (Priority: P2)

**Goal**: Idempotent boost purchase and regional subscription with same payment rails.

**Independent Test**: Boost retry same idempotency key → one order; confirmed payment activates boost window.

### Tests for User Story 4

- [X] T040 [P] [US4] Boost idempotency test (SC-005) in `apps/api/test/payments/boost-idempotency.test.ts`
- [X] T041 [P] [US4] Subscription create and cancel-at-period-end test in `apps/api/test/payments/subscriptions.test.ts`

### Implementation for User Story 4

- [X] T042 [US4] Implement `POST /listings/:id/boost` in `apps/api/src/modules/payments/boosts.controller.ts`
- [X] T043 [US4] Implement subscription routes in `apps/api/src/modules/payments/subscriptions.controller.ts`
- [X] T044 [US4] Activate boost order (`starts_at`/`ends_at`) on payment confirm in `apps/api/src/modules/payments/payments.service.ts`
- [X] T045 [US4] Track subscription periods and `cancel_at_period_end` in `apps/api/src/modules/payments/subscriptions.service.ts`
- [X] T046 [P] [US4] Wire `GET /subscription-plans` and `GET /boost-orders` list endpoints in controllers

**Checkpoint**: User Story 4 independently testable

---

## Phase 7: User Story 5 - Payout to breeder (Priority: P2)

**Goal**: Payee registers account, requests payout with idempotency; admin approves release with ledger entries.

**Independent Test**: Payout pending until admin approve; duplicate idempotency key returns existing; ledger records release.

### Tests for User Story 5

- [X] T047 [P] [US5] Payout idempotency and balance validation test in `apps/api/test/wallet-ledger/payouts.test.ts`

### Implementation for User Story 5

- [X] T048 [US5] Implement payout account CRUD in `apps/api/src/modules/wallet-ledger/payouts.controller.ts`
- [X] T049 [US5] Implement payout request with available-balance check in `apps/api/src/modules/wallet-ledger/wallet-ledger.service.ts`
- [X] T050 [US5] Implement admin approve/reject payout in `apps/api/src/modules/wallet-ledger/admin-payments.controller.ts`
- [X] T051 [US5] Write payout release ledger entries and audit on approve in `apps/api/src/modules/wallet-ledger/ledger-writer.service.ts`
- [X] T052 [P] [US5] Implement `GET /ledger/me` and `GET /ledger/me/entries` in `apps/api/src/modules/wallet-ledger/wallet-ledger.service.ts`

**Checkpoint**: User Story 5 independently testable

---

## Phase 8: User Story 6 - Submit verification request (Priority: P3)

**Goal**: User submits verification by dimension; admin sees pending queue (approval deferred to M6).

**Independent Test**: Submit animal media verification → appears in `GET /admin/verifications?status=pending`.

### Tests for User Story 6

- [X] T053 [P] [US6] Verification submit and admin queue test in `apps/api/test/verification/verification-queue.test.ts`

### Implementation for User Story 6

- [X] T054 [US6] Extend `verification_requests` with `dimension` column in migration or alter script under `supabase/migrations/`
- [X] T055 [US6] Implement `POST /verifications` in `apps/api/src/modules/verification/verifications.controller.ts`
- [X] T056 [US6] Implement `GET /admin/verifications` pending queue in `apps/api/src/modules/verification/admin-verifications.controller.ts`
- [X] T057 [P] [US6] Implement `GET /verifications/me` in `apps/api/src/modules/verification/verifications.controller.ts`

**Checkpoint**: All six user stories independently testable

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Refunds, balanced ledger invariant, audit coverage, quickstart validation

- [X] T058 Implement admin refund with mandatory `reasonCode` in `apps/api/src/modules/wallet-ledger/admin-payments.controller.ts`
- [X] T059 [P] Refund without reason rejected test (SC-003) in `apps/api/test/wallet-ledger/refund-validation.test.ts`
- [X] T060 [P] Balanced double-entry invariant test in `apps/api/test/wallet-ledger/ledger-writer.test.ts`
- [X] T061 [P] Audit events for webhook, refund, payout, and verification actions across payment modules
- [X] T062 [P] Update OpenAPI drift tests for M5 endpoints in `apps/api/test/openapi.test.ts`
- [X] T063 Run quickstart validation scenarios in `specs/005-payments-trust/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start design on M4 breeding workflow being available
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–8)**: All depend on Foundational; US3 depends on M4 `PaymentPending` transitions
- **Polish (Phase 9)**: Depends on US1–US5 core payment paths

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P1)**: After Foundational — shares `LedgerWriterService` and webhook_events with US1
- **US3 (P1)**: After US1 reconcile/webhook handlers and M4 breeding-requests module
- **US4 (P2)**: After US1 intent create rails
- **US5 (P2)**: After US1 ledger entries exist (needs confirmed payments for balance)
- **US6 (P3)**: After Foundational — independent of payment flows

### Within Each User Story

- Tests written first — must FAIL before implementation
- Migrations (T005–T009) before repository
- `LedgerWriterService` (T017) before reconcile and webhook confirm paths
- Provider stubs before webhook controller
- Story checkpoint before next priority

### Parallel Opportunities

- T005–T009 migrations can be authored in parallel (separate files)
- T010–T012 shared enums in parallel
- US1 tests T018–T019 in parallel
- US2 stub providers T029–T030 in parallel
- US4 tests T040–T041 in parallel
- US6 can run parallel with US4/US5 once Foundational complete

---

## Parallel Example: User Story 2

```bash
# Tests first (parallel):
T027: apps/api/test/payments/webhook-dedup.test.ts
T028: apps/api/test/payments/webhook-signature.test.ts

# Provider stubs (parallel, single task T030 covers jazzcash + stripe):
T029: apps/api/src/modules/payments/providers/easypaisa.stub.ts
T030: apps/api/src/modules/payments/providers/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (migrations + ledger writer critical)
3. Complete Phase 3: User Story 1 (bank transfer path)
4. **STOP and VALIDATE**: quickstart US1 scenarios
5. Demo intent → proof → reconcile flow

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → demo (PK MVP payment path)
3. US2 + US3 → test → demo (provider-ready + workflow alignment)
4. US4 → test → demo (monetization stubs)
5. US5 → test → demo (payout loop)
6. US6 → test → demo (verification queue)
7. Polish → full quickstart green

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: US1 + US3 (intents + breeding integration)
   - Developer B: US2 (webhooks + provider stubs)
   - Developer C: US4 + US6 (monetization + verification)
3. US5 after US1 ledger path merged

---

## Notes

- `PaymentProvider` interface lives in `packages/shared/src/integrations/index.ts` — all provider adapters implement it
- Client-reported payment success is forbidden (FR-002) — no PATCH confirm endpoint
- Ledger and `webhook_events` are insert-only — verified by T013 immutability test
- Bank transfer confirms via admin reconcile only; provider stubs use webhook endpoint
- Verification approve/reject endpoints are M6 — queue surface only in this feature
- Commit after each task or logical group; stop at checkpoints to validate independently
