# Contract: Provider webhooks (public, signature-verified)

Paths under `/api/v1`. **No Bearer auth** — authenticated via provider signature. Rate-limited
separately (`webhook` category). Raw body preserved for signature verification.

## POST /payments/:provider/webhook

Process provider payment notification. (FR-003, US2)

- `:provider`: `easypaisa` | `jazzcash` | `stripe`
- Headers: provider-specific signature header (adapter maps per stub):
  - Easypaisa/JazzCash stub: `X-Payment-Signature` (HMAC-SHA256 of body with `PAYMENT_STUB_SECRET`)
  - Stripe stub: `Stripe-Signature` (stub format)
- Body: raw JSON per provider stub schema
- 200: `{ "status": "processed" | "duplicate_ignored" }` — idempotent on replay
- 400 `VALIDATION_FAILED`: malformed payload
- 401 `UNAUTHENTICATED`: invalid signature (FR-003 scenario 3)
- 404 `NOT_FOUND`: unknown `provider_reference` when intent not found (logged, no ledger write)

### Stub payload (dev/staging)

```json
{
  "eventId": "evt_unique_123",
  "providerReference": "intent_provider_ref",
  "status": "succeeded",
  "amount": 5000.00,
  "currencyCode": "PKR"
}
```

### Processing rules

1. Adapter `verifyWebhook()` validates signature and parses `PaymentProviderEvent`.
2. Insert `webhook_events` with `provider_event_id = eventId`; on unique violation → 200
   `duplicate_ignored` with zero ledger effect (SC-002).
3. On success: transition intent → `confirmed`, write balanced `ledger_entries`, emit
   `payment.confirmed` + analytics `payment_confirmed`.
4. If intent links `request_id` in `PaymentPending`, invoke breeding-request transition
   → `Scheduled` in same transaction (FR-007).

### Bank transfer

Bank transfer does **not** use this endpoint — confirmation is admin reconcile only
(`admin-payments.md`).
