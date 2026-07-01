# Contract: Listings lifecycle

Paths under `/api/v1`. Owner mutations require Bearer. Errors: `{ code, message, details? }`.
Publish uses `default` rate limit; public reads use `search` category where applicable.

## POST /listings

Create draft listing for a publish-ready animal. (FR-001)

- Auth: Bearer (owner)
- Body: `{ animalId, listingType, title, description?, breedingMethod, priceAmount?,
  currencyCode?, availability?, locationRadiusKm? }`
- 201: listing object `status: draft`
- 400 `VALIDATION_FAILED`: animal not publish-ready or wrong owner
- 403 `FORBIDDEN`: suspended owner
- 409 `CONFLICT`: animal already has active listing

## PATCH /listings/:id

Update own draft or paused listing. (FR-001)

- Auth: Bearer (owner)
- Body: partial fields (title, description, fee, availability, breedingMethod, etc.)
- 200: updated listing; audit `listing.updated`
- 400: cannot edit `active` fields that require re-publish per policy
- 403 / 404

## POST /listings/:id/publish

Publish listing to active (or pending_review). (FR-002, FR-008)

- Auth: Bearer (owner)
- Body: `{ idempotencyKey? }` (optional; no payment side effects in M3)
- 200: `{ status: "active" | "pending_review", publishedAt }`; animal `breedingStatus: listed`;
  audit `listing.published`; analytics `animal_published`
- 400 `VALIDATION_FAILED`: missing fields, animal lost publish-ready, blocked health
- 403 / 404

## POST /listings/:id/pause

Hide from public search. (FR-001)

- Auth: Bearer (owner)
- 200: `{ status: "paused" }`; audit `listing.paused`
- 400: invalid transition

## POST /listings/:id/unpublish

Return to draft. (FR-001)

- Auth: Bearer (owner)
- 200: `{ status: "draft" }`; animal `breedingStatus: publish_ready`; audit
  `listing.unpublished`

## GET /listings/:id

Public listing detail. (FR-006, US3)

- Auth: optional (analytics `listing_viewed` when loaded)
- 200: `PublicListingDetail` — animal summary, verification dimensions (per-dimension
  labels), breeding terms, media public URLs, owner `displayName` — **no `phone` field**
- 404: not found, not `active`, suspended, or soft-deleted

## GET /listings/mine

List own listings (dashboard).

- Auth: Bearer
- Query: `cursor?`, `limit?`, `status?`
- 200: `{ data: [...], meta: { nextCursor?, hasMore } }`
