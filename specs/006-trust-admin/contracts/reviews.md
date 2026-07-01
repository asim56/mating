# Contract: Reviews & reputation (authenticated)

Paths under `/api/v1`. Errors: `{ code, message, details? }`.

## POST /reviews

Submit review after eligible completed request. (FR-005, US3)

- Body:
  ```json
  {
    "requestId": "uuid",
    "subjectUserId": "uuid",
    "subjectAnimalId?": "uuid",
    "rating": 4,
    "title?": "string",
    "body?": "string"
  }
  ```
- 201: `{ id, status: "published"|"flagged", rating, ... }` — `flagged` when
  `is_dispute_influenced` on linked dispute
- 409 `CONFLICT`: duplicate `(requestId, reviewerId)` (SC-003 — 0% success rate in tests)
- 400: request not eligible or outside review window
- 403: non-participant

## PATCH /reviews/:id

Edit within edit window by reviewer. (FR-005)

- Body: `{ rating?, title?, body? }`
- 200: updated review
- 403: not reviewer or window expired

## GET /reviews

Public/list reviews for a user or animal.

- Query: `subjectUserId?`, `subjectAnimalId?`, `cursor?`, `limit?`
- 200: only `status=published` reviews in public context
- Hidden reviews excluded (FR-006)

## GET /users/:id/reputation

Reputation summary for profile/listing surfaces.

- 200:
  ```json
  {
    "userId": "uuid",
    "score": 72,
    "verifiedDimensionCount": 3,
    "completedBreedingCount": 5,
    "averageRating": 4.2,
    "publishedReviewCount": 4,
    "badges": [{ "dimension": "health", "status": "approved" }]
  }
  ```
- Excludes hidden reviews and suspended-user hidden content from aggregates

## POST /admin/reviews/:id/moderate

Approve or hide review. (FR-006, US3 scenario 3)

- Auth: `super_admin` | `support_agent`
- Body: `{ "action": "approve"|"hide", "notes?": "string" }`
- 200: `{ id, status: "published"|"hidden" }`
- Audit: `review.moderated` / `review.hidden`
- Hidden reviews immediately excluded from `GET /users/:id/reputation`

## GET /admin/reviews

Moderation queue.

- Query: `status?=flagged|pending`, `cursor?`, `limit?`
- 200: paginated reviews for support review
