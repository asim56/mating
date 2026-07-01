# Phase 1 Data Model: Launch Hardening (M7)

M7 adds **operational** artifacts only — no new user-facing domain entities. Business tables
from M1–M6 are referenced for retention classification and test coverage. See
`contracts/retention.md` for the authoritative retention contract.

Migration file (see `plan.md`):

- `20250901000000_m7_retention.sql`

## Entity → storage mapping

| Spec entity | Where it lives |
|-------------|----------------|
| Retention Policy | `contracts/retention.md` + `public.retention_policies` (reference) |
| Erasure Request | `public.erasure_requests` |
| Test Matrix | `apps/api/test/coverage/manifest.json` (CI artifact) |
| Alert Rule | `docker/alerts/*.yml` + `doc/Setup.md` §Alerts |
| DR Runbook | `quickstart.md` §DR + `apps/api/test/dr/*` |
| Launch Checklist | `contracts/launch-checklist.md` + `public.launch_checklist_signoffs` |

## `public.retention_policies`

Machine-readable retention reference seeded from `contracts/retention.md`. Admin-readable;
updated only via migration or admin config endpoint (future).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `data_class` | text UNIQUE | stable slug, e.g. `profile_pii`, `payment_financial` |
| `description` | text | human-readable scope |
| `retention_period` | interval | e.g. `7 years`, `90 days` |
| `erasure_mode` | text | `redact` \| `soft_delete` \| `hard_delete` \| `immutable` \| `anonymize` |
| `legal_basis` | text null | e.g. `tax_record`, `audit_trail`, `consent_evidence` |
| `tables` | text[] | affected table names (documentation) |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | `set_updated_at()` trigger |

- **Validation**: `erasure_mode` check constraint; `data_class` unique.
- **RLS**: read for `super_admin`, `support_agent`; write service-role only.
- **Seed**: one row per data class in `contracts/retention.md` §Data classes.

## `public.erasure_requests`

Tracks right-to-erasure workflow for auditability.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `subject_account_id` | uuid | FK → `auth.users(id)`; indexed |
| `requested_by` | uuid | admin actor |
| `status` | text | `pending` \| `in_progress` \| `completed` \| `blocked` \| `failed` |
| `block_reason` | text null | e.g. `open_dispute` |
| `steps_completed` | jsonb | array of `{ step, completed_at }` |
| `error_detail` | text null | if `failed` |
| `created_at` | timestamptz | default `now()` |
| `completed_at` | timestamptz null | |

- **State transitions**: `pending → in_progress → completed`; `pending → blocked` (open
  dispute); `in_progress → failed` (partial completion logged in `steps_completed`).
- **RLS**: service-role only (admin API path).
- **Audit**: create, block, complete each emit `audit_logs` events (`erasure.requested`,
  `erasure.completed`, `erasure.blocked`).

## `public.launch_checklist_signoffs`

Optional waiver / sign-off records for launch gate items.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `checklist_item_id` | text | matches `contracts/launch-checklist.md` item id |
| `status` | text | `passed` \| `waived` |
| `signed_by` | uuid | admin account |
| `waiver_rationale` | text null | required when `waived` |
| `signed_at` | timestamptz | default `now()` |

- **Validation**: `waiver_rationale` NOT NULL when `status = 'waived'`.
- **RLS**: read for admins; write service-role only.

## Test Matrix Manifest

File: `apps/api/test/coverage/manifest.json`

Documents every critical path CI must cover. Structure:

```json
{
  "version": 1,
  "rbac": [
    { "route": "POST /api/v1/admin/users/:id/status", "roles_allowed": ["super_admin", "support_agent"], "test": "rbac.matrix.test.ts" }
  ],
  "state_transitions": [
    { "entity": "breeding_request", "from": "requested", "to": "accepted", "test": "state-transitions.test.ts" }
  ],
  "audit_events": [
    { "action": "breeding_request.status_changed", "test": "audit-events.test.ts" }
  ],
  "ledger_rules": [
    { "rule": "webhook_replay_idempotent", "test": "ledger-consistency.test.ts" }
  ]
}
```

Implementers populate the full matrix from M1–M6 module inventories during `/speckit-tasks`.
CI fails if any manifest entry lacks a passing test reference.

### Critical path inventory (seed for manifest)

**RBAC surfaces** (non-exhaustive — expand in tasks):

| Module | Routes / actions | Roles |
|--------|------------------|-------|
| identity | admin revoke sessions, suspend | `super_admin`, `support_agent` |
| users | admin role grant, erasure | `super_admin` |
| animals | publish, health record add | owner, `veterinarian` |
| marketplace | listing publish/unpublish | owner, admin |
| breeding | accept/reject/schedule/complete | participant, admin |
| payments | reconcile, refund, payout release | `super_admin` |
| verification | approve/reject dimension | `super_admin`, `veterinarian`, `inspector` |
| reviews | moderate | `super_admin`, `support_agent` |

**State machines**:

| Entity | Terminal states | Key transitions |
|--------|-----------------|-----------------|
| `account_status` | `suspended` | active ↔ suspended |
| `breeding_requests` | `closed`, `cancelled` | full M4 lifecycle |
| `payment_intents` | `confirmed`, `failed`, `refunded` | pending → confirmed (webhook/reconcile) |
| `protected_payment` | `released`, `refunded` | held → released |
| `verification_requests` | `approved`, `rejected` | pending → approved/rejected |
| `disputes` | `resolved`, `closed` | open → resolved |

**Ledger consistency rules**:

- Confirmed payment → balanced debit/credit entries.
- Refund → offsetting entries with reason code.
- Webhook replay → no additional entries for same `idempotency_key`.

## Alert Rule artifact

Not a DB table — defined in `docker/alerts/*.yml` and documented in `research.md` §5.
Each rule maps: `signal`, `threshold`, `window`, `channel`, `runbook_url`.

## Retention ↔ table mapping (quick reference)

| Data class | Primary tables |
|------------|----------------|
| `identity_credentials` | `auth.users`, `auth.identities` |
| `profile_pii` | `profiles` |
| `session_telemetry` | `sessions` |
| `consent_preferences` | `consents`, `notification_preferences` |
| `animal_listing` | `animals`, `listings`, storage `animal-media` |
| `health_clinical` | `health_records` |
| `messaging` | `conversations`, `messages` |
| `breeding_workflow` | `breeding_requests`, `breeding_request_events`, `breeding_records` |
| `payment_financial` | `payment_intents`, `payment_proofs`, `ledger_entries`, `payouts` |
| `audit_immutable` | `audit_logs` |
| `analytics_product` | `analytics_events` (+ PostHog) |
| `support_operations` | `disputes`, moderation queue tables |

Full periods and erasure modes: `contracts/retention.md`.
