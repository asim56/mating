# Phase 1 Data Model: Breeding Workflow

Migration: `supabase/migrations/20250803000000_breeding_workflow.sql`

Aligns with `doc/IntegrationGuide.md` workflow, messaging, and dispute tables. Depends on M2
`animals`, M3 `listings`, M1 `profiles`, `outbox_messages`, `audit_logs`.

## Entity → table mapping

| Spec entity | Table |
|-------------|-------|
| Breeding Request | `public.breeding_requests` |
| Breeding Request Event | `public.breeding_request_events` |
| Breeding Record | `public.breeding_records` |
| Dispute | `public.disputes` |
| Conversation | `public.conversations` |
| Message | `public.messages` |

## `public.breeding_requests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `requester_id` | uuid FK | → `profiles(id)` |
| `recipient_id` | uuid FK | → `profiles(id)` |
| `requester_animal_id` | uuid FK | → `animals(id)` |
| `recipient_animal_id` | uuid FK | → `animals(id)` |
| `listing_id` | uuid FK null | → `listings(id)` |
| `status` | text | `BREEDING_REQUEST_STATUS` snake_case; default `requested` (or `draft` if saved) |
| `breeding_method` | text | `natural \| artificial_insemination \| semen_purchase \| record_only` |
| `proposed_at` | timestamptz null | |
| `scheduled_at` | timestamptz null | |
| `completed_at` | timestamptz null | |
| `location_type` | text null | `owner_location \| breeder_location \| clinic \| custom` |
| `location_details` | jsonb | address/coords snapshot |
| `fee_amount` | numeric(12,2) null | placeholder until M5 payment |
| `currency_code` | text | from region |
| `notes` | text null | |
| `metadata` | jsonb | eligibility snapshot, cancellation reason |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | soft delete on cancel |

**Validation on create**:

- Listing `active` when `listing_id` provided.
- Both accounts `active`; animals not deleted; not same animal (except `record_only`).
- Natural mating: opposite sex.
- Supported method for species/region.
- Min age / health per region config.

**State machine** (canonical — see `packages/shared`):

```text
draft → requested
requested → accepted | rejected | cancelled
accepted → payment_pending | cancelled
payment_pending → scheduled | disputed
scheduled → in_progress | cancelled | disputed
in_progress → completed | disputed
completed → record_generated | disputed
record_generated → closed
disputed → refunded | closed
```

**RLS**: `requester_id` OR `recipient_id` = `auth.uid()` for SELECT; mutations via API
service role with policy checks; admin/support read all.

## `public.breeding_request_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK | → `breeding_requests(id)` |
| `actor_id` | uuid FK null | → `profiles(id)` |
| `event_type` | text | e.g. `status_changed`, `dispute_opened` |
| `from_status` | text null | |
| `to_status` | text null | |
| `metadata` | jsonb | reason, schedule, idempotency |
| `created_at` | timestamptz | immutable |

**Immutability**: REVOKE UPDATE, DELETE on app roles.

**Index**: `(request_id, created_at)`.

## `public.breeding_records`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK UNIQUE | → `breeding_requests(id)` — idempotency anchor |
| `requester_animal_id` | uuid FK | snapshot |
| `recipient_animal_id` | uuid FK | snapshot |
| `breeding_method` | text | |
| `breeding_date` | date | |
| `outcome_status` | text | default `pending_follow_up` |
| `record_pdf_path` | text null | signed URL generation |
| `metadata` | jsonb | location, vet refs, participants |
| `created_at`, `updated_at` | timestamptz | |

**Rule**: exactly one row per `request_id`; regeneration is no-op returning existing.

## `public.disputes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK | → `breeding_requests(id)` |
| `opened_by` | uuid FK | → `profiles(id)` |
| `assigned_to` | uuid FK null | M6 |
| `status` | text | `open` at M4; resolution states M6 |
| `reason_code` | text | `DISPUTE_REASON_CODES` |
| `description` | text null | |
| `resolution` | text null | M6 |
| `resolution_type` | text null | M6 |
| `payment_intent_id` | uuid FK null | M5/M6 |
| `resolved_at` | timestamptz null | M6 |
| `metadata` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

**M4 scope**: INSERT open disputes only; no resolve in this feature.

## `public.conversations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK null | XOR with listing link policy |
| `listing_id` | uuid FK null | pre-request inquiry |
| `status` | text | `active \| frozen \| archived` |
| `created_at` | timestamptz | |

**Rule**: at least one of `request_id` or `listing_id` set.

## `public.conversation_participants`

| Column | Type | Notes |
|--------|------|-------|
| `conversation_id` | uuid FK | |
| `user_id` | uuid FK | → `profiles(id)` |
| `role` | text | `requester \| recipient \| support` |
| `joined_at` | timestamptz | |

**PK**: `(conversation_id, user_id)`.

## `public.messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `conversation_id` | uuid FK | |
| `sender_id` | uuid FK | → `profiles(id)` |
| `body` | text null | masked at rest when policy requires |
| `attachment_path` | text null | private bucket; signed read |
| `moderation_status` | text | `clean \| reported \| hidden` |
| `created_at` | timestamptz | |
| `deleted_at` | timestamptz null | soft delete |

**Index**: `(conversation_id, created_at DESC)` for cursor pagination.

**RLS**: participants + support read; sender insert; non-participants denied.

## Shared types (`@mating/shared`)

- `BreedingRequestStatus` (PascalCase API / snake_case DB mapper)
- `BREEDING_REQUEST_TRANSITIONS: Record<Status, Action[]>`
- `BreedingMethod`, `DisputeReasonCode`
- `PHONE_REVEAL_POLICY` default `accepted_or_scheduled`

## Audit events

- `breeding_request.created`, `breeding_request.status_changed`, `breeding_request.dispute_opened`
- `breeding_record.generated`
- `message.reported`, `conversation.frozen`

## Outbox templates (M4)

| Transition | Template key | Category |
|------------|--------------|----------|
| → requested | `breeding.request_received` | transactional |
| → accepted | `breeding.request_accepted` | transactional |
| → rejected | `breeding.request_rejected` | transactional |
| → scheduled | `breeding.scheduled` | transactional |
| → completed | `breeding.completed` | transactional |
| → disputed | `breeding.disputed` | transactional |

## Analytics events

- `breeding_request_created`, `dispute_opened`, `record_generated` (no message body / phone)
