# Contract: Boosts & subscriptions (authenticated)

Paths under `/api/v1`. Bearer required. Idempotency on purchase endpoints.

## GET /subscription-plans

List active plans for caller's region. (FR-009)

- Query: `regionCode?` (defaults from profile)
- 200: `{ data: [{ id, code, name, interval, amount, currencyCode, features }] }`

## POST /subscriptions

Subscribe to a plan (creates payment intent). (FR-009, US4)

- Body:
  ```json
  {
    "planId": "uuid",
    "provider": "bank_transfer|easypaisa|jazzcash|stripe",
    "idempotencyKey": "string"
  }
  ```
- 201: `{ subscription: { id, status, currentPeriodStart, currentPeriodEnd }, paymentIntent: { ... } }`
- 200: duplicate idempotency returns existing subscription + intent

## GET /subscriptions/me

Current user subscription.

- 200: subscription object or `{ subscription: null }`

## POST /subscriptions/:id/cancel

Cancel at period end. (FR-009)

- 200: `{ id, cancelAtPeriodEnd: true, currentPeriodEnd }`
- 400: already cancelled

## POST /listings/:id/boost

Purchase listing boost (creates boost order + payment intent). (FR-008, US4)

- Body:
  ```json
  {
    "boostType": "featured_7d",
    "provider": "bank_transfer|easypaisa|jazzcash|stripe",
    "idempotencyKey": "string"
  }
  ```
- 201: `{ boostOrder: { id, status: "pending" }, paymentIntent: { ... } }`
- 200: duplicate idempotency → same order (SC-005)
- 403: non-listing-owner
- 400: listing not active

## GET /boost-orders

List own boost orders.

- Query: `cursor?`, `status?`
- 200: paginated list with `startsAt`, `endsAt` when active

### Boost visibility rule

When linked intent reaches `confirmed`, boost order → `active` with `starts_at = now()`,
`ends_at = now() + region.config.boostDurationDays` (default 7). Marketplace search ranks
boosted listings higher during window (M3 integration).
