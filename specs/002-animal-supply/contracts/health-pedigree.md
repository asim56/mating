# Contract: Health & pedigree records (authenticated)

Paths under `/api/v1`. Owner or authorized vet (health) / owner only (pedigree).

## POST /animals/:id/health-records

Add clinical record. (FR-004)

- Body: `recordType`, `title`, `recordDate`, `expiresAt?`, `storagePath?`, `metadata?`
- 201: health record object
- 403: non-owner/non-vet

## GET /animals/:id/health-records

List records for owned animal (owner/vet/admin).

- Query: `cursor?`, `limit?`
- 200: paginated list; documents via signed read URLs on demand

## POST /animals/:id/health-records/:recordId/read-url

Mint signed read URL for document. Audited for admin access.

- 201: `{ url, expiresAt }`

## POST /animals/:id/pedigree

Add pedigree entry. (FR-005)

- Body: `sireAnimalId?`, `damAnimalId?`, `registryName?`, `registryNumber?`, `documentPath?`
- 201: pedigree record `verificationStatus: unverified`

## GET /animals/:id/pedigree

List pedigree records for animal.

- 200: `{ data: [...] }`
