# Contract: Data Retention & Right-to-Erasure

Authoritative retention and erasure contract for production launch. Implements FR-002, FR-003,
and constitution consent/retention requirements. Machine-readable mirror: `retention_policies`
table (`data-model.md`).

**Scope**: All data classes in the M1–M6 architecture. Financial and audit immutability is
non-negotiable.

---

## Principles

1. Every data class has a defined retention period before production (SC-002).
2. Erasure redacts or soft-deletes personal identifiers in **mutable** tables; **immutable**
   ledger and audit entries are preserved with pseudonymized actor references where needed.
3. Open disputes block erasure until resolved or escalated (spec edge case).
4. Storage objects follow table retention with a **90-day grace** after soft-delete before
   physical deletion (configurable per class).
5. Analytics uses aggregated, PII-scrubbed properties only (FR-009).

---

## Data classes

### `identity_credentials`

- **Tables**: `auth.users`, `auth.identities` (Supabase-managed)
- **Retention**: Life of account + **30 days** after erasure completes
- **Erasure mode**: `hard_delete` via Supabase Auth admin API after domain erasure steps
- **Legal basis**: Account relationship

### `profile_pii`

- **Tables**: `profiles`
- **Retention**: Life of account
- **Erasure mode**: `redact` — replace `display_name`, `phone`, `email`, `address` with
  placeholders (`[erased]`, null); retain `id` for FK integrity until cascade completes
- **Legal basis**: Consent / contract

### `session_telemetry`

- **Tables**: `sessions`
- **Retention**: **90 days** after last activity; purge job scheduled
- **Erasure mode**: `hard_delete` on erasure; revoke all sessions immediately
- **Legal basis**: Security legitimate interest

### `consent_preferences`

- **Tables**: `consents`, `notification_preferences`
- **Retention**: Life of account + **7 years** (PECA/TCPA evidence)
- **Erasure mode**: `anonymize` — detach `user_id`, retain consent version/timestamp record
- **Legal basis**: Regulatory evidence

### `animal_listing`

- **Tables**: `animals`, `listings`, storage bucket `animal-media`
- **Retention**: Life of record + **2 years** after soft-delete
- **Erasure mode**: `soft_delete` on erasure; media deleted after 90-day grace
- **Legal basis**: Marketplace operations

### `health_clinical`

- **Tables**: `health_records`
- **Retention**: Life of animal + **7 years**
- **Erasure mode**: `redact` free-text fields; retain structured vaccination dates where
  legally required
- **Legal basis**: Veterinary / welfare records

### `messaging`

- **Tables**: `conversations`, `messages`
- **Retention**: **2 years** after parent breeding request `closed`
- **Erasure mode**: `redact` message `body`; retain thread metadata for dispute window
- **Legal basis**: Communications record

### `breeding_workflow`

- **Tables**: `breeding_requests`, `breeding_request_events`, `breeding_records`
- **Retention**: **7 years** after request `closed`
- **Erasure mode**: `anonymize` participant PII on erasure; retain animal IDs, dates, method,
  location (non-PII), and record integrity
- **Legal basis**: Breeding transaction record

### `payment_financial`

- **Tables**: `payment_intents`, `payment_proofs`, `ledger_entries`, `payout_accounts`,
  `payout_requests`
- **Retention**: **7 years** from transaction date
- **Erasure mode**: `immutable` for `ledger_entries`; `redact` proof storage paths and
  payer/payee PII on linked profiles; amounts and reason codes retained
- **Legal basis**: Tax / financial audit

### `audit_immutable`

- **Tables**: `audit_logs`
- **Retention**: **7 years** minimum
- **Erasure mode**: `immutable` — no DELETE; `actor_id` may be pseudonymized to
  `00000000-0000-0000-0000-000000000000` with `metadata.erased_actor = true`
- **Legal basis**: Tamper-evident audit trail (Constitution I)

### `analytics_product`

- **Tables**: `analytics_events`; PostHog project
- **Retention**: **13 months** rolling
- **Erasure mode**: `anonymize` — delete or anonymize rows matching `subject_account_id`;
  PostHog person delete API invoked
- **Legal basis**: Product improvement; minimized PII

### `support_operations`

- **Tables**: `disputes`, moderation queue, support notes
- **Retention**: **3 years** after resolution
- **Erasure mode**: `redact` reporter and free-text notes; retain resolution outcome
- **Legal basis**: Dispute handling

---

## Erasure API contract

Admin-only. Errors use stable `{ code, message, details? }` body.

### POST /api/v1/admin/users/:id/erasure

Initiate right-to-erasure for the target account.

- **Auth**: Bearer; roles: `super_admin` only
- **Body**: `{ "reason": "string", "ticket_ref?": "string" }`
- **Preconditions**:
  - No open dispute where subject is party → else `409 CONFLICT` `ERASURE_BLOCKED_OPEN_DISPUTE`
  - No in-flight payout for subject → else `409 CONFLICT` `ERASURE_BLOCKED_PENDING_PAYOUT`
- **202**: `{ "erasureRequestId", "status": "in_progress" }`
- **Processing steps** (async or sync for MVP — must complete within single request or job):
  1. Create `erasure_requests` row
  2. Revoke all `sessions`; Supabase Auth sign-out
  3. Redact `profiles` per `profile_pii`
  4. Soft-delete animals/listings; queue storage purge
  5. Redact `messages.body`
  6. Anonymize `consents` / `notification_preferences` subject link
  7. Pseudonymize `audit_logs.actor_id` for subject
  8. Anonymize `analytics_events` + PostHog person
  9. Supabase Auth user delete (after 30-day credential retention window OR immediate with
     legal approval — default: immediate delete at step 8 for MVP staging; production may
     delay per legal)
  10. Mark `erasure_requests.status = completed`; emit `erasure.completed` audit event
- **403**: non-admin
- **404**: unknown user (non-leaking: may return 202 with no-op in production — document choice)

### GET /api/v1/admin/users/:id/erasure

- **Auth**: `super_admin`, `support_agent` (read-only)
- **200**: `{ "requests": [{ "id", "status", "createdAt", "completedAt", "blockReason" }] }`

---

## Scheduled jobs (operational)

| Job | Schedule | Action |
| --- | --- | --- |
| `purge_expired_sessions` | Daily | Delete `sessions` older than 90 days inactive |
| `purge_analytics` | Monthly | Delete `analytics_events` older than 13 months |
| `purge_soft_deleted_media` | Weekly | Remove storage objects past 90-day grace |
| `purge_messaging` | Monthly | Redact messages past 2-year post-close window |

Jobs are implemented in `/speckit-tasks`; contracts define behavior only.

---

## Verification

See `quickstart.md` §Retention & Erasure:

1. Published policy covers all classes in this document.
2. Test erasure on staging account with completed payment — ledger row count unchanged.
3. Audit log count for subject's historical actions unchanged (actor pseudonymized only).

---

## Amendment process

Changes to retention periods require Product + Legal approval, migration to update
`retention_policies` seed, and revision to this contract with version note in PR description.
