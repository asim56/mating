# Phase 0 Research: Payments & Trust

Resolves integration choices for M5 payment rails, ledger immutability, provider stubs, and
breeding-request payment state alignment. Each item: Decision / Rationale / Alternatives
considered.

## 1. Payment confirmation authority (FR-002)

- **Decision**: Payment intent status transitions to `confirmed` ONLY via (a) admin
  `POST /admin/payments/:id/reconcile` after bank-transfer proof review, or (b) verified
  provider webhook processed idempotently. Client `PATCH` or self-reported success endpoints
  are not exposed.
- **Rationale**: Constitution I + spec edge case — server-authoritative money state prevents
  fraud and aligns with protected-payment workflow.
- **Alternatives considered**: Client "I paid" button (rejected: explicitly forbidden);
  polling provider APIs from browser (rejected: secrets + trust model).

## 2. Idempotency key scope

- **Decision**: Unique constraints on `(provider, idempotency_key)` for `payment_intents` and
  `payouts`. Intent creation with duplicate key returns the existing intent (200/201 same body).
  Webhook dedup uses separate `webhook_events` unique `(provider, provider_event_id)`.
- **Rationale**: Retries from mobile/web and provider replay must not double-charge or
  double-credit ledger.
- **Alternatives considered**: Idempotency only at HTTP layer (rejected: webhooks need
  separate dedup store); global idempotency across providers (rejected: provider is part of
  the natural key).

## 3. `webhook_events` dedup table

- **Decision**: Insert `webhook_events` row inside the same transaction as intent confirmation
  and ledger write. Columns: `provider`, `provider_event_id` (from stub/provider payload),
  `payment_intent_id`, `payload_hash`, `status`, `processed_at`. Unique
  `(provider, provider_event_id)`; on conflict return 200 without side effects.
- **Rationale**: ImplementationPlan explicitly closes the missing webhook-dedup DDL; supports
  M7 replay test (SC-002).
- **Alternatives considered**: Idempotency keyed only on payment intent (rejected: different
  event types may arrive); Redis SETNX (rejected: new infra, YAGNI).

## 4. Provider adapter pattern

- **Decision**: `PaymentProviderFactory` resolves implementation by region config +
  `provider` enum: `bank_transfer`, `easypaisa`, `jazzcash`, `stripe`. Launch ships stub
  classes implementing `createPaymentIntent`, `verifyWebhook`, `refund` from
  `@mating/shared`; stubs use env `PAYMENT_STUB_SECRET` for HMAC signature verification in
  dev/staging.
- **Rationale**: Integration.md mandates swappable providers; stubs prove architecture before
  merchant onboarding.
- **Alternatives considered**: Inline switch per controller (rejected: untestable, violates
  Integration checkpoint); live SDKs at launch (rejected: scope lock).

## 5. Immutable ledger model

- **Decision**: Double-entry `ledger_entries` per confirmed payment/refund/payout:
  `account_type` (`platform_escrow` | `payee_balance` | `payer_external` | `platform_revenue`),
  `entry_type` (`payment_confirmed` | `refund` | `payout_release` | `fee`),
  `direction` (`debit` | `credit`), `amount`, `currency_code`. Each transaction group shares
  `transaction_id` uuid in metadata; sum debits = sum credits. DB grants revoke UPDATE/DELETE
  for app roles (same pattern as `audit_logs`).
- **Rationale**: Constitution I financial immutability; revenue not computed from provider
  dashboards alone.
- **Alternatives considered**: Single running balance column (rejected: poor audit trail);
  event-sourced ledger without SQL enforcement (rejected: needs DB-level immutability test).

## 6. Bank-transfer proof storage

- **Decision**: Private bucket `payment-proofs`; path
  `{payerId}/{paymentIntentId}/{filename}`; `payment_intents.metadata.proof_path` after
  upload. Admin read via signed URL minted server-side; every admin proof view emits
  `admin.document_accessed` audit event.
- **Rationale**: FR-005 + Constitution III; reuses `StorageProvider` from M2.
- **Alternatives considered**: Public bucket with obscured URLs (rejected: privacy);
  embedding proof in DB bytea (rejected: storage cost + pattern mismatch).

## 7. Breeding-request payment integration (FR-007)

- **Decision**: On accept when deposit/full fee required, breeding-request service transitions
  to `PaymentPending` and stores `payment_intent_id` on request metadata. `PaymentConfirmed`
  handler (from reconcile or webhook) calls breeding-request transition service to move
  `PaymentPending` → `Scheduled` per shared transition map from M4. Deposit vs full fee
  determined by region/listing policy in request metadata.
- **Rationale**: Money and workflow state must stay aligned (US3).
- **Alternatives considered**: Payment module directly UPDATE breeding_requests (rejected:
  violates module boundary); async-only via outbox (acceptable for notifications but state
  transition stays synchronous in same TX as ledger).

## 8. Refund and reconciliation

- **Decision**: Admin reconcile sets intent `confirmed` + writes ledger. Refund requires
  `reason_code` from `REFUND_REASON_CODES` enum in `@mating/shared`; creates compensating
  ledger entries + intent status `refunded` (or `partially_refunded`). Refund without reason →
  400 `VALIDATION_FAILED`.
- **Rationale**: FR-006, SC-003; audit trail for disputes (M6 triggers refunds).
- **Alternatives considered**: Provider-only refunds without ledger (rejected: breaks
  immutability invariant).

## 9. Payout flow

- **Decision**: Payee registers `payout_accounts` (bank/mobile wallet metadata). Payout request
  checks available balance from ledger aggregation; status `pending` until admin
  `POST /admin/payouts/:id/approve` writes payout ledger entries and sets `released`. Unique
  `(provider, idempotency_key)` on payout creation.
- **Rationale**: FR-010; completes supply-side financial loop with admin gate.
- **Alternatives considered**: Auto-payout on completion (rejected: launch needs manual
  reconciliation in PK); support-agent payout approval (rejected: spec edge case — admin only).

## 10. Boosts and subscriptions (stubs)

- **Decision**: `boost_orders` linked to `listings` + `payment_intent`; active boost when
  intent confirmed and `starts_at`/`ends_at` window set (default 7 days per region config).
  `subscription_plans` seeded per region; `subscriptions` track `current_period_*` and
  `cancel_at_period_end`; payment via same intent rails (stub checkout URL optional).
- **Rationale**: FR-008/009; monetization without live recurring billing SDK at launch.
- **Alternatives considered**: Separate payment tables per product (rejected: duplicates intent
  model).

## 11. Verification queue (M5 surface only)

- **Decision**: `verification_requests` with `dimension` field
  (`owner_identity|media|health|vaccination|pedigree|facility`), `subject_type`,
  `subject_id`, `status=pending`. Users `POST /verifications`; admins
  `GET /admin/verifications?status=pending`. Approve/reject endpoints belong to M6.
- **Rationale**: Bridges M2 passive badges to M6 workflows per spec US6.
- **Alternatives considered**: Reuse animals.metadata only (rejected: needs queue + reviewer
  assignment in M6).

## Open items deferred (not blocking)

- Live Easypaisa/JazzCash/Stripe merchant credentials → post-launch swap behind same interface.
- Regulated escrow legal clearance → marketing language blocked until review (Assumptions).
- Tax automation → out of scope.
