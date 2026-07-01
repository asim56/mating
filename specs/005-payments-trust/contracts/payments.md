# Contract: Payment intents & proof (authenticated)

Paths under `/api/v1`. Bearer required unless noted. Idempotency: send
`Idempotency-Key` header or body `idempotencyKey` (required on create). Errors:
`{ code, message, details? }`.

## POST /payments/intents

Create a payment intent. (FR-001, US1, US4)

- Body:
  ```json
  {
    "purpose": "deposit|full_fee|boost|subscription",
    "amount": 5000.00,
    "currencyCode": "PKR",
    "provider": "bank_transfer|easypaisa|jazzcash|stripe",
    "requestId?": "uuid",
    "payeeId?": "uuid",
    "boostOrderId?": "uuid",
    "subscriptionPlanId?": "uuid",
    "idempotencyKey": "client-unique-string"
  }
  ```
- 201: intent object `{ id, status, purpose, amount, currencyCode, provider, providerReference?, checkoutUrl? }`
- 200: same body when duplicate `(provider, idempotencyKey)` — no second intent (edge case)
- 400 `VALIDATION_FAILED`: invalid purpose/provider combo, amount ≤ 0, wrong currency for region
- 403 `FORBIDDEN`: non-participant on linked request, suspended account
- 404 `NOT_FOUND`: request/listing/plan not found

**Note**: No endpoint accepts client-reported `status: confirmed` (FR-002).

## GET /payments/intents/:id

Get intent status for payer or payee.

- 200: intent + `proofUploaded: boolean` (no raw proof URL in list)
- 403 / 404

## GET /payments/intents

List own intents (payer).

- Query: `cursor?`, `limit?`, `status?`, `purpose?`
- 200: cursor-paginated `{ data, meta }`

## POST /payments/intents/:id/proof/upload-url

Mint signed upload URL for bank-transfer proof. (FR-005, US1)

- Body: `{ "contentType": "image/jpeg|image/png|application/pdf", "filename": "string" }`
- 201: `{ "url", "path", "expiresAt" }` — bucket `payment-proofs`
- 400: intent not `bank_transfer` or wrong status
- 403: non-payer

## POST /payments/intents/:id/proof

Attach uploaded proof path and move intent to `pending_reconciliation`. (FR-005)

- Body: `{ "storagePath": "from upload-url response" }`
- 200: `{ "id", "status": "pending_reconciliation" }`
- 400: path not under payer prefix or intent wrong state
- Audit: `payment.proof_uploaded`

## GET /payments/intents/:id/proof (admin only)

Admin fetches short-lived signed read URL for proof review.

- Auth: Bearer + `super_admin`
- 200: `{ "readUrl", "expiresAt" }`
- Audit: `admin.document_accessed` with subject = intent id
