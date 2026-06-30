# Contract: Admin payment operations (authenticated + admin)

Paths under `/api/v1/admin`. Require Bearer + `super_admin` (payout approval per FR-010;
support agents forbidden — spec edge case). All actions audited (FR-012).

## POST /admin/payments/:id/reconcile

Confirm bank-transfer payment after proof review. (FR-006, US1)

- Body: `{ "notes?": "string" }`
- 200: `{ id, status: "confirmed" }` + ledger entries written
- 400: intent not `pending_reconciliation` or missing proof
- 403: non-admin
- Side effects: breeding request `PaymentPending` → `Scheduled` when linked; audit
  `payment.reconciled`

## POST /admin/payments/:id/refund

Issue refund with mandatory reason code. (FR-006, SC-003)

- Body:
  ```json
  {
    "reasonCode": "dispute_resolution|cancellation|admin_adjustment|...",
    "amount?": 5000.00,
    "notes?": "string"
  }
  ```
- 200: `{ id, status: "refunded"|"partially_refunded" }` + compensating ledger entries
- 400 `VALIDATION_FAILED`: missing `reasonCode` (rejected 100% in tests — SC-003)
- 403: non-admin

## GET /admin/payments

List intents for reconciliation queue.

- Query: `status?=pending_reconciliation`, `provider?`, `cursor?`, `limit?`
- 200: cursor-paginated intents with payer/payee summary (no proof content)

## POST /admin/payouts/:id/approve

Approve and release payout. (FR-010, US5)

- Body: `{ "notes?": "string" }`
- 200: `{ id, status: "released" }` + payout ledger entries
- 400: payout not `pending`
- 403: non-admin or support agent (forbidden)

## POST /admin/payouts/:id/reject

Reject pending payout.

- Body: `{ "reason": "string" }`
- 200: `{ id, status: "rejected" }`

## GET /admin/payouts

Admin list all payouts.

- Query: `status?`, `cursor?`, `limit?`
- 200: paginated list
