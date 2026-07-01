# Contract: Animals & media (authenticated)

Paths under `/api/v1`. Bearer required. Cursor pagination on lists. Errors: `{ code, message, details? }`.

## POST /animals

Create draft animal. (FR-001)

- Body: species, breedId?, name?, sex, location fields, regionCode (defaults from profile)
- 201: animal object `breedingStatus: draft`
- 400 `VALIDATION_FAILED` / 403 suspended owner

## GET /animals

List own animals.

- Query: `cursor?`, `limit?`, `status?`
- 200: `{ data: [...], meta }`

## GET /animals/:id

Get owned animal with verification dimensions and media summary.

- 200: full animal + `mediaCount`
- 403 / 404

## PATCH /animals/:id

Update draft fields.

- 200: updated animal; audited

## DELETE /animals/:id

Soft-delete. (FR-009)

- 200: `{ deleted: true }`

## POST /animals/:id/publish-ready

Mark publish-ready after eligibility. (FR-002)

- 200: `breedingStatus: publish_ready`; audit `animal.publish_ready`
- 400: missing image, min-age, blocked health, missing declaration

## POST /animals/:id/media/upload-url

Mint signed upload URL. (FR-003)

- Body: `{ contentType, mediaType, filename }`
- 201: `{ url, path, expiresAt }`
- 403: non-owner

## GET /animals/:id/media

List media metadata (not raw bytes).

- 200: `{ data: [{ id, mediaType, sortOrder, readUrl? }] }` — `readUrl` only for owner via short-lived signed URL endpoint or embedded in list for owner session

## GET /animals/:id/verification

Public-safe dimension map for authorized viewers.

- 200: `{ dimensions: { media: "unverified", ... } }` — never `{ verified: true }` aggregate
