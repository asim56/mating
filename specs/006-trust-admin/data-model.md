# Phase 1 Data Model: Trust & Admin

M6 primarily extends tables from M4/M5. New migration if `reviews` not shipped in M4:

- `supabase/migrations/20250915000000_reviews.sql`

Reputation is a **derived read model** — no `reputation_summaries` table at MVP (computed in
`ReputationService`; optional materialized view deferred).

## Entity → table mapping

| Spec entity | Table / derivation |
|-------------|-------------------|
| Verification Decision | `verification_requests` terminal state + subject `metadata.verification_dimensions` |
| Dispute Case | `disputes` (M4) |
| Review | `reviews` |
| Reputation Summary | computed from reviews + verification dimensions + breeding completions |
| Moderation Action | audit event + status fields on `listings` / `animals` / `messages` |
| Audit Query Result | read over `audit_logs` (M1) |

## `public.verification_requests` (M6 extensions)

Uses M5 table. M6 adds workflow columns if not present:

| Column | Type | Notes |
|--------|------|-------|
| `decided_by` | uuid FK null | reviewer profile |
| `decided_at` | timestamptz null | |
| `decision_notes` | text null | rejection reason shown to owner |

- **State transitions**: `pending` → `approved` | `rejected` (terminal).
- **Side effect**: updates subject dimension map; audit `verification.approved` /
  `verification.rejected`.

## `public.disputes` (M4 base, M6 workflow)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK unique | → `breeding_requests` |
| `opened_by` | uuid FK | participant |
| `assigned_to` | uuid FK null | support agent |
| `status` | text | `open` \| `assigned` \| `investigating` \| `resolved` |
| `reason_code` | text | from `DISPUTE_REASON_CODES` |
| `description` | text null | |
| `resolution_code` | text null | set on resolve |
| `resolution_type` | text null | `refund_full` \| `refund_partial` \| `no_refund_close` \| `cancel_request` |
| `payment_intent_id` | uuid FK null | for refund trigger |
| `resolved_at` | timestamptz null | |
| `resolved_by` | uuid FK null | |
| `metadata` | jsonb | investigation notes |
| `created_at`, `updated_at` | timestamptz | |

- **State transitions**: `open` → `assigned` → `investigating` → `resolved` (terminal).
  Resolve on already-closed → rejected (edge case).
- **Side effects**: breeding request → `Refunded` or `Closed`; optional M5 refund.

## `public.reviews`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `request_id` | uuid FK | → `breeding_requests` |
| `reviewer_id` | uuid FK | participant |
| `subject_user_id` | uuid FK | reviewee |
| `subject_animal_id` | uuid FK null | optional animal focus |
| `rating` | smallint | 1–5 check constraint |
| `title` | text null | |
| `body` | text null | |
| `status` | text | `pending` \| `published` \| `hidden` \| `flagged` |
| `is_dispute_influenced` | boolean | default false |
| `moderated_by` | uuid FK null | |
| `moderated_at` | timestamptz null | |
| `created_at`, `updated_at` | timestamptz | |
| `deleted_at` | timestamptz null | soft delete |

- **Constraints**: unique `(request_id, reviewer_id)`.
- **Validation**: reviewer must be request participant; request in eligible terminal status;
  within review window from `request.completed_at`.
- **RLS**: public read published only; reviewer read/write own within edit window; admin
  moderate all.

## Moderation state (no separate table)

Moderation actions update domain rows and emit audit:

| Target | Field updated | Discovery effect |
|--------|---------------|------------------|
| `listings` | `status = suspended` | excluded from search |
| `animals` | `health_status = blocked` | publish/listing blocked |
| `messages` | `moderation_status = frozen` | thread read-only |

Audit action examples: `listing.suspended`, `animal.suspended`, `message.reported`,
`message.frozen`.

## `public.audit_logs` (M1 — read-only in M6)

Explorer reads existing append-only table. Filterable columns:

- `actor_id`, `subject_type`, `subject_id`, `action`, `created_at`, `metadata` (redacted)

## Reputation read model (derived)

```typescript
type ReputationSummary = {
  userId: string;
  score: number;                    // 0–100 normalized
  verifiedDimensionCount: number;
  completedBreedingCount: number;
  publishedReviewCount: number;
  averageRating: number | null;     // published only
  badges: Array<{ dimension: string; status: string }>;
};
```

- Excludes `hidden` and `flagged` reviews from rating aggregate.
- Excludes suspended accounts' hidden reviews from public API.

## Relationships

```text
verification_requests ── animals | profiles (subject)
disputes (1) ── breeding_requests (1)
reviews (n) ── breeding_requests (1)
reviews ── profiles (reviewer, subject_user)
audit_logs ── (cross-cutting read)
```

## Shared types (`@mating/shared`)

- `DisputeStatus`, `DisputeReasonCode`, `DisputeResolutionType`, `DisputeResolutionCode`
- `ReviewStatus`, `ModerationReasonCode`
- `VERIFICATION_RBAC_MATRIX` — role → allowed dimensions
- `REPUTATION_WEIGHTS`, `REVIEW_WINDOW_DAYS`, `REVIEW_EDIT_WINDOW_HOURS`

## Audit events (M6)

- `verification.approved`, `verification.rejected`
- `dispute.assigned`, `dispute.resolved`
- `review.created`, `review.moderated`, `review.hidden`
- `listing.suspended`, `animal.suspended`, `message.reported`
- `admin.audit_queried`, `admin.dashboard_viewed`, `admin.document_accessed`
