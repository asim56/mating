# Phase 0 Research: Animal Supply

## 1. Publish-ready vs listing publish

- **Decision**: `animals.breeding_status` uses `draft | publish_ready | listed | not_listed`;
  M2 sets `publish_ready` after eligibility; M3 listing publish sets `listed`.
- **Rationale**: Separates animal eligibility from marketplace listing lifecycle.
- **Alternatives**: Single `listings`-only gate (rejected: animals need value before listings).

## 2. Eligibility evaluation

- **Decision**: `AnimalEligibilityService` reads `getRegionConfig(regionCode)` from
  `@mating/shared` for min-age, health flags; blocks `health_status = blocked`.
- **Rationale**: Constitution II — config-driven, not hard-coded.
- **Alternatives**: DB-only rules without shared types (rejected: layer drift risk).

## 3. Storage uploads

- **Decision**: Implement `SupabaseStorageProvider` implementing `StorageProvider`; upload URLs
  scoped to `animal-media` / `health-records` / `pedigree-documents` with owner path prefix
  `{ownerId}/{animalId}/...`.
- **Rationale**: Reuses shared interface; server mints URLs (no service key in browser).
- **Alternatives**: Direct client bucket upload with anon key (rejected: security).

## 4. Verification dimensions (passive)

- **Decision**: `animals.metadata.verification_dimensions` jsonb map:
  `owner_identity | media | health | vaccination | pedigree | facility` → `unverified|pending|approved|rejected`.
  Display layer never aggregates to generic "verified".
- **Rationale**: Constitution I explicit labels; M6 updates dimensions on approval.
- **Alternatives**: Single `verification_status` column only (rejected: too coarse).

## 5. Health record types

- **Decision**: `record_type` enum:
  `vaccination | deworming | disease_test | fertility | pregnancy | certificate | contraindication`.
- **Rationale**: Matches Features.md clinical list.
- **Alternatives**: Free-text only (rejected: filtering/reporting needs types).

## 6. Pedigree sire/dam links

- **Decision**: Optional `sire_animal_id` / `dam_animal_id` FK to `animals`; allow null with
  manual registry fields for offline ancestry.
- **Rationale**: Supports incomplete PK pedigree data.
- **Alternatives**: Require both parents in-system (rejected: unrealistic for MVP).

## 7. Module naming: clinical `health`

- **Decision**: Clinical module path `apps/api/src/modules/animal-health/` imported as
  `AnimalHealthModule` to avoid collision with `modules/health` liveness check.
- **Rationale**: IntegrationGuide naming note.
- **Alternatives**: Merge into animals module (rejected: bounded context separation).
