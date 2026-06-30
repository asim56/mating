# Phase 1 Data Model: Identity, Profiles & Platform Foundation (M1 + inline M0)

Maps the spec's Key Entities to concrete tables. Credentials/OTP live in Supabase-managed
`auth.*` schema; this feature owns the `public.*` tables below. All new tables use UUID PKs,
`created_at`/`updated_at` (via the shared `set_updated_at()` trigger) where mutable, and RLS.
`account_id` references `auth.users(id)`.

Migration files (see `plan.md`):

- `20250702000000_regions_breeds.sql`
- `20250703000000_identity_m1.sql`

## Entity → table mapping

| Spec entity | Where it lives |
|-------------|----------------|
| Account | `auth.users` (Supabase) + `public.account_status` |
| Authentication Method | `auth.identities` (Supabase: phone, email/password) |
| OTP Challenge | Supabase Auth (GoTrue) internal — not a `public` table |
| Session/Device | `public.sessions` (mirrors `auth.sessions`, adds device metadata) |
| Role Assignment | `public.user_roles` |
| Profile | `public.profiles` |
| Region | `public.regions` |
| Breed | `public.breeds` |
| Notification Preference | `public.notification_preferences` |
| Consent | `public.consents` |
| Outbox Message | `public.outbox_messages` |
| Audit Event | `public.audit_logs` |

## `public.account_status`

One row per account; tracks suspension independent of credentials.

| Column | Type | Notes |
|--------|------|-------|
| `account_id` | uuid PK | FK → `auth.users(id)` on delete cascade |
| `status` | text | `active` \| `suspended`; default `active` |
| `reason` | text null | suspension reason (admin-entered) |
| `changed_by` | uuid null | admin account that last changed status |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | maintained by `set_updated_at()` trigger |

- **Validation**: `status` constrained to the two values via check constraint.
- **State transitions**: `active → suspended` (admin suspend), `suspended → active` (admin
  reactivate). Each transition emits an audit event (FR-014) and is the authorization gate
  for protected actions (FR-011, edge case: suspended user with a live session is blocked at
  action time, not by session destruction).
- **RLS**: account may read own status; only service role (admin actions go through the API)
  writes.

## `public.user_roles`

Roles granted to an account (many per account).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `account_id` | uuid | FK → `auth.users(id)` cascade |
| `role` | text | one of `USER_ROLES` (`super_admin`, `support_agent`, `breeder`, `animal_owner`, `veterinarian`, `inspector`, `buyer`) |
| `granted_by` | uuid null | admin who granted (null = self-select/bootstrap) |
| `created_at` | timestamptz | default `now()` |

- **Constraints**: unique `(account_id, role)`; `role` check against the enum values.
- **Validation rules**: self-service sign-up may insert only `buyer` \| `breeder` \|
  `animal_owner` (default `buyer`); `super_admin` \| `support_agent` \| `veterinarian` \|
  `inspector` require an existing admin (FR-012b). Initial `super_admin` inserted by the
  bootstrap seed (FR-012a).
- **RLS**: account may read own roles; writes service-role only (admin assignment via API).
- **Audit**: every grant/revoke emits an audit event (FR-014).

## `public.sessions`

Server-owned mirror of authenticated sessions for visibility + revocation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | equals Supabase `session_id` claim |
| `account_id` | uuid | FK → `auth.users(id)` cascade; indexed |
| `device_descriptor` | text null | parsed UA / client-supplied label |
| `ip` | inet null | last-seen IP |
| `user_agent` | text null | raw UA |
| `status` | text | `active` \| `revoked`; default `active`; indexed |
| `last_seen_at` | timestamptz | updated on authenticated requests |
| `created_at` | timestamptz | default `now()` |
| `revoked_at` | timestamptz null | set on revocation |
| `revoked_by` | uuid null | account/admin that revoked |

- **State transitions**: `active → revoked` (user self-revoke, admin force-logout, recovery
  global sign-out, sign-out). Revoked is terminal; a new sign-in creates a new row.
- **Guard contract**: `JwtAuthGuard` rejects a request whose `session_id` is absent or
  `revoked` → SC-003 satisfied (effective immediately, bounded ≤1 min worst case).
- **RLS**: account may read/revoke own sessions; admins (via API service role) may revoke any.
- **FR-007**: list endpoint returns active sessions with `device_descriptor`, `last_seen_at`,
  `created_at` (cursor-paginated).

## `public.audit_logs`

Append-only record of privileged account actions (Constitution I, FR-014).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `actor_id` | uuid null | who performed it (null = system/bootstrap) |
| `subject_id` | uuid null | account acted upon |
| `action` | text | e.g. `account.suspended`, `account.reactivated`, `role.granted`, `role.revoked`, `session.revoked` |
| `context` | jsonb | non-sensitive details (ip, ua, reason, role) |
| `created_at` | timestamptz | default `now()` |

- **Immutability**: DB grants `REVOKE UPDATE, DELETE` for application roles; inserts only.
  Verified by test (insert succeeds; update/delete rejected).
- **RLS**: no client read in this feature (admin audit explorer is M6); service-role writes.

## `public.analytics_events`

Event capture for M1 (FR-015, FR-023); `user_signed_up` and future discovery events.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `event` | text | e.g. `user_signed_up` |
| `account_id` | uuid null | may be null pre-account |
| `properties` | jsonb | non-sensitive only (region, method); NO phone/email/OTP/password |
| `created_at` | timestamptz | default `now()` |

- **Privacy rule (Constitution III)**: properties MUST exclude identity content; a test
  asserts disallowed keys are stripped.

## `public.regions`

Canonical region configuration (FR-018).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | text unique | `PK` \| `US` |
| `name` | text | display name |
| `currency` | text | `PKR` \| `USD` |
| `default_locale` | text | `en` \| `ur` |
| `active` | boolean | default true |
| `config` | jsonb | eligibility, compliance, payment-provider metadata |
| `created_at` / `updated_at` | timestamptz | standard |

- **Seed**: PK and US rows required (SC-008).
- **RLS**: public read of active regions; admin write via API service role.

## `public.breeds`

Species/breed taxonomy (FR-019).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `region_id` | uuid FK | → `regions(id)` |
| `species` | text | e.g. cattle, goat |
| `name` | text | breed name |
| `created_at` / `updated_at` | timestamptz | |

- **Constraint**: unique `(region_id, species, name)`.

## `public.profiles`

User profile (FR-020).

| Column | Type | Notes |
|--------|------|-------|
| `account_id` | uuid PK | FK → `auth.users(id)` |
| `display_name` | text | required for completion |
| `region_id` | uuid FK | → `regions(id)` |
| `locale` | text | `en` \| `ur` |
| `profile_complete` | boolean | default false |
| `created_at` / `updated_at` | timestamptz | |

- **RLS**: owner read/write own profile.

## `public.notification_preferences`

Per-channel/category settings (FR-021).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `account_id` | uuid FK | |
| `channel` | text | email \| sms \| push |
| `category` | text | transactional \| marketing \| … |
| `enabled` | boolean | |

## `public.consents`

Marketing opt-in/out audit trail (FR-021).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `account_id` | uuid FK | |
| `consent_type` | text | e.g. `marketing_email` |
| `version` | text | policy version |
| `granted` | boolean | |
| `created_at` | timestamptz | |

## `public.outbox_messages`

Transactional notification outbox (FR-024).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `aggregate_type` | text | e.g. `account` |
| `aggregate_id` | uuid | |
| `event_type` | text | |
| `payload` | jsonb | template key, locale, non-sensitive vars |
| `status` | text | pending \| delivered \| failed |
| `idempotency_key` | text unique | |
| `created_at` / `processed_at` | timestamptz | |

## `public.notification_logs` / `public.devices`

Delivery audit and push device tokens for the notifications module (FR-024).

## Relationships

```text
regions (1) ── (0..n) breeds
regions (1) ── (0..n) profiles.region_id
auth.users (1) ──┬── (1) account_status
                 ├── (1) profiles
                 ├── (0..n) user_roles
                 ├── (0..n) sessions
                 ├── (0..n) notification_preferences
                 ├── (0..n) consents
                 └── (0..n) audit_logs.subject_id
outbox_messages ── notification_logs (0..n)
```

## Derived shared types (`@mating/shared`)

- `AccountStatus = 'active' | 'suspended'`
- `SessionStatus = 'active' | 'revoked'`
- `Session` (id, accountId, deviceDescriptor?, lastSeenAt, createdAt, status)
- `SELF_SELECTABLE_ROLES` / `ADMIN_ONLY_ROLES` partitions of `USER_ROLES`
- OTP/password policy constants: `OTP_LENGTH=6`, `OTP_TTL_SECONDS=300`,
  `OTP_MAX_ATTEMPTS=5`, `OTP_RESEND_COOLDOWN_SECONDS=60`, `PASSWORD_MIN_LENGTH=10`,
  `ACCESS_TOKEN_TTL_SECONDS=60`, `PK_PHONE_REGEX`, `US_PHONE_REGEX`
- `REGION_CODES = ['PK', 'US']`
