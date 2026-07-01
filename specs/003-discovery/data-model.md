# Phase 1 Data Model: Discovery

Migration: `supabase/migrations/20250802000000_discovery.sql`

Aligns with `doc/IntegrationGuide.md` marketplace tables. Depends on M2 `animals`,
`animal_media`, `breeds`, `regions`, `profiles`.

## Entity → table mapping

| Spec entity | Table |
|-------------|-------|
| Listing | `public.listings` |
| Saved Listing | `public.saved_listings` |
| Search Result | Query projection (no table) |
| SEO Browse Page | Query projection (no table) |

## `public.listings`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `animal_id` | uuid FK | → `animals(id)`; one active listing per animal enforced in service |
| `owner_id` | uuid FK | → `profiles(id)`; denormalized for RLS |
| `region_id` | uuid FK | → `regions(id)` |
| `listing_type` | text | `animal \| stud_service \| breeder_profile \| semen_provider \| expected_offspring` per `LISTING_TYPES` |
| `status` | text | `LISTING_STATUS`; default `draft` |
| `title` | text | required |
| `description` | text null | |
| `breeding_method` | text | `natural \| artificial_insemination \| semen_purchase \| record_only` |
| `price_amount` | numeric(12,2) null | fee; listing-type may require |
| `currency_code` | text | from region |
| `availability` | jsonb | `{ windows: [...], notes? }` |
| `location_radius_km` | numeric(6,2) null | search distance anchor |
| `search_vector` | tsvector null | **DB trigger only** — never app-written |
| `boost_active` | boolean | default false; purchase in M5 |
| `published_at` | timestamptz null | set on first publish |
| `expires_at` | timestamptz null | auto-exclude from search when past |
| `metadata` | jsonb | promotion flags, listing-type extras |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | soft delete |

**Indexes**:

- `listings_search_idx` GIN on `search_vector`
- `listings_region_species_idx` on `(region_id, status)` partial `WHERE deleted_at IS NULL`
- `listings_animal_id_idx` on `animal_id`
- `listings_owner_status_idx` on `(owner_id, status)`

**Trigger** (from IntegrationGuide):

```sql
create or replace function public.listings_search_vector_update()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

create trigger listings_search_vector_trg
before insert or update of title, description on listings
for each row execute function public.listings_search_vector_update();
```

**Validation rules**:

- Publish: animal `breeding_status = publish_ready`, not deleted, listing-type fields
  complete, animal eligibility passes.
- Pause/unpublish: owner only; audited.
- Public read: `status = 'active' AND deleted_at IS NULL`.

**State transitions**:

```text
draft → pending_review → active (if review required)
draft → active (if review not required)
active → paused → active
active → draft (unpublish)
active → expired (system, expires_at)
* → suspended (admin)
pending_review → rejected | active (admin)
```

**RLS**:

- `SELECT`: public policy for `active` non-deleted; owner sees all own listings.
- `INSERT/UPDATE/DELETE`: owner on own rows; service role for admin suspend.

## `public.saved_listings`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | uuid FK | → `profiles(id)` |
| `listing_id` | uuid FK | → `listings(id)` |
| `created_at` | timestamptz | default `now()` |

**PK**: `(user_id, listing_id)` — enforces idempotent save.

**RLS**: user CRUD own rows only.

## Search projection (read model)

Not persisted. Built by `matching` service joining:

- `listings` (active, non-deleted)
- `animals` (species, breed_id, sex, city, lat/lng, health_status, pedigree_status,
  `metadata.verification_dimensions`)
- `breeds` (name)
- Optional requester animal context for scoring (authenticated search with `requesterAnimalId`)

**Scoring inputs** (weights in `@mating/shared`):

| Signal | Weight | Source |
|--------|-------:|--------|
| Breed compatibility | 25 | requester vs listing animal breed/species |
| Health readiness | 20 | `health_status`, recent health records summary |
| Pedigree completeness | 15 | `pedigree_status`, pedigree_records presence |
| Distance | 15 | haversine(requester location, animal location) |
| Verification level | 10 | count of `approved` dimensions |
| Prior outcomes | 10 | completed breeding_records count (0 at cold start) |
| Low dispute risk | 5 | inverse of participant dispute rate (0 at cold start) |

**Tie-break**: `score DESC`, `published_at DESC`, `id ASC`.

## Analytics events (M1 `analytics_events`)

| Event | When | Properties (privacy-safe) |
|-------|------|-------------------------|
| `listing_viewed` | public detail load | `listingId`, `regionId`, `species` |
| `search_performed` | `GET /listings` | filter keys, `resultCount`, `regionId` — no health doc paths |
| `animal_published` | listing publish | `animalId`, `listingId`, `listingType` |
| `listing_saved` | first save | `listingId` |

## Audit events

- `listing.created`, `listing.updated`, `listing.published`, `listing.paused`,
  `listing.unpublished`, `listing.suspended`

## Shared types (`@mating/shared`)

- `ListingStatus`, `ListingType`, `BreedingMethod`
- `COMPATIBILITY_WEIGHTS`, `LISTING_PUBLISH_REQUIREMENTS`
- `PublicListingSummary`, `ListingDetail` (no phone fields)
