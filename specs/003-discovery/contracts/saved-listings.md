# Contract: Saved listings

Paths under `/api/v1`. Bearer required. Errors: `{ code, message, details? }`.

## GET /saved-listings

List saved listings for the authenticated user. (FR-007, US4)

- Auth: Bearer
- Query: `cursor?`, `limit?`
- 200:

```json
{
  "data": [
    {
      "savedAt": "2026-06-15T10:00:00Z",
      "listing": { /* PublicListingSummary or unavailable stub */ },
      "available": true
    }
  ],
  "meta": { "nextCursor?", "hasMore" }
}
```

- Suspended, non-active, or soft-deleted listings: `available: false` (excluded or stub per
  implementation — spec requires not shown as normal active save).

## POST /saved-listings

Save a listing (idempotent). (FR-007, SC-005)

- Auth: Bearer
- Body: `{ listingId }`
- 201: `{ listingId, savedAt }` on first save
- 200: same shape on duplicate save (idempotent)
- 404: listing not found
- 400: cannot save non-active listing

## DELETE /saved-listings/:listingId

Unsave (idempotent). (FR-007)

- Auth: Bearer
- 204: removed or was not saved
- Analytics: no event on delete (optional `listing_unsaved` deferred)
