# Contract: Disputes (open only)

Paths under `/api/v1`. Bearer required for participant open. Resolution endpoints are
**M6** — not implemented in M4. Errors: `{ code, message, details? }`.

## POST /breeding-requests/:id/dispute

Open dispute from eligible request state. (FR-010, US4)

- Auth: Bearer (participant: requester or recipient)
- Body:

```json
{
  "reasonCode": "no_show | animal_condition | payment_issue | other",
  "description": "optional details"
}
```

- 201:

```json
{
  "dispute": {
    "id": "uuid",
    "requestId": "uuid",
    "status": "open",
    "reasonCode": "no_show",
    "createdAt": "..."
  },
  "requestStatus": "Disputed"
}
```

- Side effects: `breeding_request_events` row; audit `breeding_request.dispute_opened`;
  analytics `dispute_opened`; optional conversation freeze; outbox `breeding.disputed`
- 400 `VALIDATION_FAILED`: invalid `reasonCode`
- 409 `INVALID_STATE_TRANSITION`: e.g. from `Rejected`, `Draft`, `Closed`
- 403: non-participant
- 409 `CONFLICT`: dispute already open for request

## GET /disputes/:id

Participant or support views open dispute. (read-only in M4)

- Auth: Bearer (participant, `support_agent`, or `super_admin`)
- 200: dispute detail + request summary (no resolution fields populated in M4)
- 403 / 404

## Out of scope (M6)

The following exist in `doc/IntegrationGuide.md` but are **not** M4 contracts:

- `GET /admin/disputes` queue
- `POST /admin/disputes/:id/assign`
- `POST /admin/disputes/:id/resolve`
- Request transition `Disputed → Refunded | Closed` via resolution

M4 tests cover open path only; resolution state transitions tested in M6.
