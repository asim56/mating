# Contract: Breeding requests & records

Paths under `/api/v1`. Bearer required unless noted. Errors: `{ code, message, details? }`.
Request-creation uses `request-creation` rate limit. Record generation requires
`Idempotency-Key` header.

Status values in responses use PascalCase (`Requested`, `Accepted`, …) matching
`doc/Features.md`.

## POST /breeding-requests

Create breeding request against active listing. (FR-002, US1)

- Auth: Bearer (requester)
- Body:

```json
{
  "listingId": "uuid",
  "requesterAnimalId": "uuid",
  "recipientAnimalId": "uuid",
  "breedingMethod": "natural",
  "proposedAt": "2026-07-01T10:00:00Z",
  "locationType": "breeder_location",
  "locationDetails": {},
  "notes": "string"
}
```

- 201: request `status: Requested`; event log row; outbox to recipient; audit +
  `breeding_request_created` analytics
- 400 `VALIDATION_FAILED`: same animal, wrong sex for natural, inactive animal/account,
  unsupported method, listing not active
- 403 `FORBIDDEN`: suspended user
- 409 `CONFLICT`: duplicate open request for same animal pair + listing
- 429 `RATE_LIMITED`

## GET /breeding-requests

List requests for current user (requester or recipient). (FR-003)

- Query: `cursor?`, `limit?`, `status?`, `role?` (`requester|recipient|all`)
- 200: `{ data: [...], meta }`

## GET /breeding-requests/:id

Request detail with event timeline. (FR-004)

- 200: request + `events: [{ eventType, fromStatus, toStatus, actorId, createdAt }]`
- 403: non-participant
- 404

## POST /breeding-requests/:id/accept

Recipient accepts. (FR-003, US1)

- Auth: Bearer (recipient only)
- 200: `status: Accepted`; event + audit + outbox
- 409 `INVALID_STATE_TRANSITION`

## POST /breeding-requests/:id/reject

Recipient rejects. (FR-003)

- Auth: Bearer (recipient)
- Body: `{ reason? }`
- 200: `status: Rejected`

## POST /breeding-requests/:id/cancel

Requester (or policy-defined party) cancels from allowed states.

- 200: `status: Cancelled`

## POST /breeding-requests/:id/schedule

Confirm schedule from `Accepted` or `PaymentPending`. (US2)

- Body: `{ scheduledAt, locationType?, locationDetails? }`
- 200: `status: Scheduled`

## POST /breeding-requests/:id/start

Mark in progress (from `Scheduled`).

- 200: `status: InProgress`

## POST /breeding-requests/:id/complete

Mark breeding complete. (US2)

- Auth: Bearer (participant per policy)
- 200: `status: Completed`; may trigger async record generation
- 409: illegal state

## POST /breeding-requests/:id/record

Generate breeding record (idempotent). (FR-005, SC-005)

- Headers: `Idempotency-Key: <uuid>`
- 201: new `breedingRecord` on first call; request → `RecordGenerated`
- 200: existing record on retry (same body, no duplicate)
- 409: request not in `Completed` or later eligible state

## POST /breeding-requests/:id/close

Close after record generated.

- 200: `status: Closed`

## State transition errors

All illegal transitions:

- 409 `INVALID_STATE_TRANSITION`: `{ code, message, details: { from, action } }`

## PaymentPending note (M5 placeholder)

- Transition `Accepted → PaymentPending` may be exposed but payment collection is no-op in
  M4; `PaymentPending → Scheduled` allowed for staging tests without payment intent.
