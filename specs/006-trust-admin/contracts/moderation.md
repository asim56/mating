# Contract: Content moderation (authenticated + support/admin)

Paths under `/api/v1/admin`. Actions audited immediately (FR-007). Listing suspension
removes from public discovery within one minute (SC-004).

## POST /admin/listings/:id/suspend

Suspend listing for policy violation. (US4)

- Auth: `super_admin` | `support_agent`
- Body:
  ```json
  {
    "reasonCode": "fraud|cruelty|disease_risk|illegal|other",
    "notes?": "string"
  }
  ```
- 200: `{ id, status: "suspended" }`
- Side effects: excluded from `GET /listings` search; audit `listing.suspended`
- 403: field_onboarding_rep

## POST /admin/listings/:id/unsuspend

Restore listing after review.

- Auth: admin/support
- Body: `{ "notes?": "string" }`
- 200: `{ id, status: "active" }`

## POST /admin/listings/:id/approve-category

Grant exotic/category approval for region-gated species (PK). (US4 scenario 2)

- Auth: `super_admin`
- Body: `{ "approved": true, "notes?": "string" }`
- 200: listing `metadata.category_approved = true`
- 400: species not requiring approval in region

## POST /admin/animals/:id/suspend

Block animal for welfare/fraud/disease.

- Auth: support/admin
- Body: `{ "reasonCode": "...", "notes?": "string" }`
- 200: `{ id, healthStatus: "blocked" }` — blocks publish and active listings
- Audit: `animal.suspended`

## POST /admin/animals/:id/unsuspend

Restore animal when appropriate.

- 200: restores prior health status from metadata snapshot

## POST /admin/messages/:id/report

Flag message for support (from M4 report path; M6 adds queue visibility).

- Auth: participant
- Body: `{ "reasonCode": "harassment|spam|welfare|fraud|other", "notes?": "string" }`
- 201: `{ reportId, messageId, status: "open" }`
- Audit: `message.reported`

## POST /admin/conversations/:id/freeze

Freeze conversation during dispute investigation.

- Auth: support/admin
- 200: `{ id, status: "frozen" }`
- Audit: `message.frozen`

## GET /admin/moderation/queue

Unified moderation inbox.

- Query: `type?=listing|animal|message`, `cursor?`, `limit?`
- 200: paginated flagged items

### Field Onboarding Rep restrictions (FR-010)

`field_onboarding_rep` receives `403` on all suspend/unsuspend/resolve routes. Allowed:
read-only user lookup with audit attribution on assistance actions documented in admin module.
