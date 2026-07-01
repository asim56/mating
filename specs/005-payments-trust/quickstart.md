# Quickstart & Validation: Payments & Trust

End-to-end validation that M5 works. Prerequisites: M4 complete (breeding requests with
`PaymentPending` transitions). Details in [data-model.md](data-model.md) and [contracts/](contracts/).

## Prerequisites

- M1–M4 quickstarts green; accepted breeding request in `PaymentPending` or ready to accept.
- `.env` includes `PAYMENT_STUB_SECRET` for webhook signature tests.
- Migrations through `20250901000400_payout_accounts_payouts.sql` applied.

## Setup

```bash
supabase db reset    # includes M5 migration series
pnpm --filter @mating/api dev
```

## Scenarios

### US1 — Bank transfer breeding fee (P1)

1. Accept breeding request requiring deposit → status `PaymentPending`.
2. `POST /payments/intents` `{ purpose: "deposit", provider: "bank_transfer", requestId, idempotencyKey }` → `201`.
3. `POST /payments/intents/:id/proof/upload-url` → upload image → `POST .../proof` →
   `pending_reconciliation`.
4. Admin `POST /admin/payments/:id/reconcile` → intent `confirmed`, ledger entries exist,
   request → `Scheduled`.
5. Attempt client-only status change (no such route) — confirm status unchanged without admin
   (FR-002).

### US2 — Provider stub webhook (P1)

1. Create intent with `provider: "easypaisa"` and stub `providerReference`.
2. `POST /payments/easypaisa/webhook` with valid `X-Payment-Signature` → `processed`.
3. Replay same `eventId` → `duplicate_ignored`; ledger row count unchanged (SC-002).
4. Replay with bad signature → `401`.

### US3 — Protected-payment states (P1)

1. Deposit-required accept → `PaymentPending`.
2. Confirm payment (reconcile or webhook) → `Scheduled` per transition map.
3. Illegal transition from `PaymentPending` to `Completed` without payment → `400`.

### US4 — Boost purchase idempotency (P2)

1. `POST /listings/:id/boost` with `idempotencyKey: "boost-1"` → order + intent.
2. Retry same key → `200` with identical order id (SC-005).
3. After payment confirm → boost `active` with `endsAt` set.

### US5 — Payout flow (P2)

1. Complete paid breeding; confirm payee ledger balance > 0.
2. `POST /payout-accounts` then `POST /payouts` with idempotency key → `pending`.
3. Non-admin `POST /admin/payouts/:id/approve` → `403`.
4. Admin approve → `released` + ledger payout entries + audit.

### US6 — Verification queue (P3)

1. `POST /verifications` for owned animal `dimension: "media"` → `pending`.
2. `GET /admin/verifications?status=pending` lists item with dimension label.
3. Approve/reject deferred to M6 quickstart.

## Automated test expectations

- Ledger UPDATE/DELETE denied at DB level (SC-004).
- Refund without `reasonCode` → 400 (SC-003).
- Duplicate webhook → zero new ledger rows (SC-002).
- Breeding payment state integration tests pass.

## Done checks

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- OpenAPI export includes payment/webhook/admin routes.
- Specialist review completed for `wallet-ledger` module.
