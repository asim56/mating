# Contract: Dispute resolution (authenticated + support/admin)

Paths under `/api/v1`. M4 opened disputes; M6 assigns and resolves. Field Onboarding Rep
forbidden on resolve (FR-010).

## GET /admin/disputes

List disputes for support queue. (FR-003)

- Auth: Bearer + `super_admin` | `support_agent`
- Query: `status?`, `assignedTo?`, `cursor?`, `limit?`
- 200: cursor-paginated `{ data: [{ id, requestId, status, reasonCode, assignedTo, createdAt }], meta }`

## GET /admin/disputes/:id

Dispute detail with request summary and linked payment intent id.

- Auth: support/admin
- 200: dispute + `requestSummary` + `paymentIntentId?`
- 403: field_onboarding_rep

## POST /admin/disputes/:id/assign

Assign dispute to self or another support agent. (US2 scenario 1)

- Auth: `super_admin` | `support_agent`
- Body: `{ "assigneeId?": "uuid" }` — defaults to caller
- 200: `{ id, status: "assigned", assignedTo }`
- Audit: `dispute.assigned`

## POST /admin/disputes/:id/investigate

Mark investigating (optional intermediate step).

- 200: `{ id, status: "investigating" }`

## POST /admin/disputes/:id/resolve

Close dispute with resolution. (FR-003, FR-004, US2)

- Auth: `super_admin` | `support_agent`
- Body:
  ```json
  {
    "resolutionType": "refund_full|refund_partial|no_refund_close|cancel_request",
    "resolutionCode": "string",
    "notes?": "string",
    "refundAmount?": 5000.00
  }
  ```
- 200: `{ id, status: "resolved", requestStatus: "Refunded|Closed|..." }`
- 400: already resolved (edge case — rejected)
- 409: refund failed (payment module error propagated)

### Resolution side effects

| resolutionType | Breeding request | Payments |
|----------------|------------------|----------|
| `refund_full` | → `Refunded` | M5 refund full amount + reason from dispute |
| `refund_partial` | → `Refunded` or `Closed` per policy | partial refund |
| `no_refund_close` | → `Closed` | none |
| `cancel_request` | → `Cancelled` | refund if deposit paid |

- Audit: `dispute.resolved` with resolution codes

## GET /breeding-requests/:id/dispute (participant)

Participant view of own dispute status.

- Auth: request participant
- 200: dispute summary or `{ dispute: null }`
