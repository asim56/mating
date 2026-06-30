# Contract: Search & discovery

Paths under `/api/v1`. Public (no auth required); optional Bearer for personalized scoring.
Uses `search` rate-limit category (429 `RATE_LIMITED` with `Retry-After`). Cursor pagination
mandatory. Errors: `{ code, message, details? }`.

## GET /listings

Search and filter active listings with deterministic ranking. (FR-004, FR-005, FR-010)

- Query parameters:
  - `q?` — full-text query (maps to `search_vector @@ plainto_tsquery`)
  - `species?`, `breedId?`, `sex?`
  - `city?`, `provinceOrState?`, `regionCode?`
  - `lat?`, `lng?`, `radiusKm?` — distance filter (haversine)
  - `feeMin?`, `feeMax?`, `currencyCode?`
  - `verificationLevel?` — minimum approved dimension count
  - `hasHealthEvidence?` — boolean
  - `hasPedigree?` — boolean
  - `breedingMethod?`
  - `availabilityAfter?`, `availabilityBefore?` — ISO dates
  - `requesterAnimalId?` — UUID; when present + authenticated, enables compatibility score
  - `cursor?`, `limit?` (default 20, max 50)
  - `sort?` — `relevance` (default when `q` or `requesterAnimalId`) \| `newest` \| `fee_asc` \|
    `fee_desc` (non-relevance sorts still filter; score omitted)
- 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "listingType": "animal",
      "species": "cattle",
      "breedName": "string",
      "sex": "female",
      "city": "Lahore",
      "fee": { "amount": "15000.00", "currencyCode": "PKR" },
      "breedingMethod": "natural",
      "verificationSummary": { "approvedCount": 2, "dimensions": { "media": "approved" } },
      "compatibilityScore": 72,
      "distanceKm": 12.4,
      "publishedAt": "2026-06-01T00:00:00Z",
      "thumbnailUrl": "https://..."
    }
  ],
  "meta": { "nextCursor": "opaque", "hasMore": true }
}
```

- Response NEVER includes owner phone or private health document paths.
- Ranking when `sort=relevance`: `compatibilityScore DESC`, `publishedAt DESC`, `id ASC`
  (documented tie-break, SC-004).
- 400 `VALIDATION_FAILED`: invalid filter combo or `requesterAnimalId` not owned by caller
- 429 `RATE_LIMITED`: search throttle exceeded

## Scoring contract (deterministic)

Weights from `@mating/shared` `COMPATIBILITY_WEIGHTS` (total 100):

| Signal | Weight |
|--------|-------:|
| Breed compatibility | 25 |
| Health readiness | 20 |
| Pedigree completeness | 15 |
| Distance | 15 |
| Verification level | 10 |
| Prior successful outcomes | 10 |
| Low dispute risk | 5 |

Each signal normalized 0–1 before weighting; final score rounded to integer 0–100.
Identical inputs MUST produce identical ordering (unit-tested).

## Analytics

Every successful search emits `search_performed` with `resultCount` and filter summary (no
private health payloads).
