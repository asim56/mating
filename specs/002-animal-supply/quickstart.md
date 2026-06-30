# Quickstart & Validation: Animal Supply

**Prerequisites**: M1 complete (`001-identity-auth` quickstart). Owner account with profile.

## Setup

```bash
supabase db reset    # includes 20250801000000_animal_supply.sql
pnpm --filter @mating/api dev
```

## Scenarios

### US1 — Draft animal

1. `POST /animals` with species/goat, sex → `201`, `breedingStatus: draft`.
2. `GET /animals` lists the animal.

### US2 — Publish-ready with media

1. `POST /animals/:id/media/upload-url` → upload to signed URL.
2. `POST /animals/:id/publish-ready` → `200` or `400` with missing fields list.
3. Verify audit row `animal.publish_ready`.

### US3 — Health & pedigree

1. `POST /animals/:id/health-records` → private list returns record.
2. `POST /animals/:id/pedigree` → `verificationStatus: unverified`.

### US4 — Verification dimensions

1. `GET /animals/:id/verification` → all dimensions `unverified` for new animal.

### US5 — Soft delete

1. `DELETE /animals/:id` → excluded from `GET /animals` active list.

See [contracts/](contracts/) and [data-model.md](data-model.md).
