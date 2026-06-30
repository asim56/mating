# Phase 1 Data Model: Animal Supply

Migration: `supabase/migrations/20250801000000_animal_supply.sql`

Aligns with `doc/IntegrationGuide.md` with `publish_ready` breeding_status and verification
dimensions in `metadata`.

## `public.animals`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_id` | uuid FK | → `profiles(id)` |
| `region_id` | uuid FK | → `regions(id)` |
| `species` | text | `SPECIES` enum |
| `breed_id` | uuid FK null | → `breeds(id)` |
| `name`, `tag_number`, `sex` | text | sex required |
| `date_of_birth`, `approximate_age_months` | date/int | one required for age |
| `weight_kg`, `color`, `description` | | |
| `latitude`, `longitude`, `city`, `province_or_state`, `country_code` | | location |
| `breeding_status` | text | `draft \| publish_ready \| listed \| not_listed` |
| `health_status` | text | includes `blocked` welfare block |
| `owner_declaration` | boolean | eligibility |
| `metadata` | jsonb | `verification_dimensions` map |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | soft delete |

**RLS**: owner CRUD own; service role for admin.

## `public.animal_media`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `animal_id` | uuid FK | |
| `storage_path` | text | bucket-relative |
| `media_type` | text | `image \| document` |
| `visibility` | text | default `private` until listing |
| `sort_order` | int | |
| `deleted_at` | timestamptz | |

## `public.health_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `animal_id` | uuid FK | |
| `veterinarian_id` | uuid FK null | → `profiles` |
| `record_type` | text | see research |
| `title`, `record_date`, `expires_at`, `status` | | |
| `storage_path` | text null | signed read |
| `created_by` | uuid FK | |
| `metadata` | jsonb | readiness flags |

**RLS**: owner + vet + admin read; owner/vet write per RBAC.

## `public.pedigree_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `animal_id` | uuid FK | |
| `sire_animal_id`, `dam_animal_id` | uuid FK null | |
| `registry_name`, `registry_number` | text | |
| `document_path` | text null | |
| `verification_status` | text | default `unverified` |

## Shared types (`@mating/shared`)

- `AnimalBreedingStatus`, `VerificationDimension`, `HealthRecordType`
- `ANIMAL_PUBLISH_READY_REQUIREMENTS` constant list for validation messages

## Audit events

- `animal.publish_ready`, `animal.updated`, `animal.soft_deleted`
- `health_record.created`, `pedigree_record.created`
