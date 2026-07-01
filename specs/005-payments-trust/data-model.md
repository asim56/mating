# Phase 1 Data Model: Payments & Trust

Migrations (see `plan.md` and `doc/ExecutionBacklog.md`):

- `20250901000000_payment_intents_webhook_events.sql`
- `20250901000100_subscription_plans_subscriptions.sql`
- `20250901000200_boost_orders.sql`
- `20250901000300_ledger_entries.sql`
- `20250901000400_payout_accounts_payouts.sql`

Extends `verification_requests` from IntegrationGuide with `dimension` column if not present.

## Entity → table mapping

| Spec entity | Table |
|-------------|-------|
| Payment Intent | `payment_intents` |
| Webhook Event | `webhook_events` |
| Ledger Entry | `ledger_entries` |
| Payout Account | `payout_accounts` |
| Payout | `payouts` |
| Boost Order | `boost_orders` |
| Subscription | `subscriptions` (+ `subscription_plans`) |
| Verification Request | `verification_requests` |

## `public.payment_intents`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `request_id` | uuid FK null | → `breeding_requests(id)` when purpose is breeding fee |
| `payer_id` | uuid FK | → `profiles(account_id)` |
| `payee_id` | uuid FK null | recipient breeder |
| `provider` | text | `bank_transfer` \| `easypaisa` \| `jazzcash` \| `stripe` |
| `provider_reference` | text null | external id from provider stub |
| `purpose` | text | `deposit` \| `full_fee` \| `boost` \| `subscription` |
| `status` | text | see state machine below |
| `amount` | numeric(12,2) | |
| `currency_code` | text | `PKR` \| `USD` from region |
| `idempotency_key` | text | client-supplied |
| `metadata` | jsonb | `proof_path`, `boost_order_id`, `subscription_id`, `transaction_id` |
| `created_at`, `updated_at` | timestamptz | |

- **Constraints**: unique `(provider, idempotency_key)`.
- **State transitions**: `created` → `pending_proof` (bank transfer after proof upload) →
  `pending_reconciliation` → `confirmed` | `failed` | `cancelled`; provider path:
  `created` → `pending_provider` → `confirmed` | `failed`; post-confirm:
  `refunded` | `partially_refunded` (admin refund only).
- **Validation**: amount > 0; currency matches payer region; purpose-specific FKs required
  (e.g. `request_id` for deposit/full_fee).
- **RLS**: payer and payee read own; admin read all via API service role; writes service-role
  only through domain services.

## `public.webhook_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `provider` | text | |
| `provider_event_id` | text | provider's event id or synthetic stub id |
| `payment_intent_id` | uuid FK null | → `payment_intents(id)` |
| `payload_hash` | text | SHA-256 of raw body for audit |
| `status` | text | `processed` \| `ignored` \| `failed` |
| `processed_at` | timestamptz | |
| `created_at` | timestamptz | |

- **Constraints**: unique `(provider, provider_event_id)`.
- **Immutability**: insert-only; no UPDATE/DELETE for application roles.
- **RLS**: no client access; service-role only.

## `public.ledger_entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `payment_intent_id` | uuid FK null | source intent when applicable |
| `payout_id` | uuid FK null | → `payouts(id)` when payout release |
| `account_type` | text | `platform_escrow` \| `payee_balance` \| `payer_external` \| `platform_revenue` |
| `account_id` | uuid null | profile id when account_type is payee-specific |
| `entry_type` | text | `payment_confirmed` \| `refund` \| `payout_release` \| `fee` |
| `transaction_id` | uuid | groups balanced double-entry set |
| `amount` | numeric(12,2) | always positive |
| `currency_code` | text | |
| `direction` | text | `debit` \| `credit` |
| `metadata` | jsonb | `reason_code`, `admin_id`, provider refs |
| `created_at` | timestamptz | insert time only — no `updated_at` |

- **Immutability**: DB grants revoke UPDATE/DELETE; verified by test (SC-004).
- **Invariant**: for each `transaction_id`, sum(debit amounts) = sum(credit amounts) per
  currency.
- **RLS**: payee may read entries where `account_id = self`; admin read all; insert service-role
  only.

## `public.payout_accounts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `owner_id` | uuid FK | → `profiles` |
| `provider` | text | `bank_transfer` \| `easypaisa` \| `jazzcash` \| `stripe_connect` |
| `account_type` | text | `bank_account` \| `mobile_wallet` |
| `account_reference` | text | masked account number / IBAN token |
| `status` | text | `unverified` \| `verified` \| `disabled` |
| `metadata` | jsonb | bank name, title (non-PII in logs) |
| `created_at`, `updated_at` | timestamptz | |

- **RLS**: owner CRUD own; admin read.

## `public.payouts`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `payee_id` | uuid FK | |
| `payout_account_id` | uuid FK | |
| `amount` | numeric(12,2) | |
| `currency_code` | text | |
| `status` | text | `pending` \| `approved` \| `released` \| `rejected` |
| `provider` | text | |
| `provider_reference` | text null | |
| `idempotency_key` | text | |
| `approved_by` | uuid FK null | admin |
| `metadata` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

- **Constraints**: unique `(provider, idempotency_key)`.
- **State transitions**: `pending` → `approved` → `released` (ledger written on release) or
  `rejected`.
- **RLS**: payee read own; admin approve via API.

## `public.boost_orders`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `listing_id` | uuid FK | → `listings(id)` |
| `buyer_id` | uuid FK | listing owner |
| `payment_intent_id` | uuid FK null | |
| `boost_type` | text | e.g. `featured_7d` |
| `status` | text | `pending` \| `active` \| `expired` \| `cancelled` |
| `starts_at`, `ends_at` | timestamptz | set on payment confirm |
| `amount`, `currency_code` | numeric/text | denormalized from intent |
| `idempotency_key` | text unique | per purchase attempt |
| `created_at`, `updated_at` | timestamptz | |

## `public.subscription_plans`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `region_id` | uuid FK | → `regions(id)` |
| `code` | text | e.g. `breeder_pro_monthly` |
| `name` | text | |
| `interval` | text | `month` \| `year` |
| `amount`, `currency_code` | | |
| `features` | jsonb | entitlements stub |
| `active` | boolean | |

- **Constraint**: unique `(region_id, code)`.

## `public.subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `subscriber_id` | uuid FK | |
| `plan_id` | uuid FK | |
| `payment_intent_id` | uuid FK null | initial payment |
| `provider`, `provider_reference` | text | stub refs |
| `status` | text | `active` \| `past_due` \| `cancelled` |
| `current_period_start`, `current_period_end` | timestamptz | |
| `cancel_at_period_end` | boolean | default false |
| `metadata` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

## `public.verification_requests` (extended)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `subject_type` | text | `animal` \| `profile` \| `facility` |
| `subject_id` | uuid | |
| `dimension` | text | `VerificationDimension` enum |
| `requester_id` | uuid FK | |
| `reviewer_id` | uuid FK null | set in M6 |
| `status` | text | `pending` \| `approved` \| `rejected` (M6 sets terminal) |
| `checklist` | jsonb | evidence refs |
| `notes` | text null | |
| `created_at`, `updated_at` | timestamptz | |

- **M5 scope**: create + list pending only; M6 adds approve/reject.

## Relationships

```text
breeding_requests (0..1) ── payment_intents
payment_intents (1) ── (0..n) webhook_events
payment_intents (1) ── (0..n) ledger_entries
payouts (1) ── (0..n) ledger_entries
boost_orders ── payment_intents
subscriptions ── subscription_plans, payment_intents
payout_accounts (1) ── (0..n) payouts
verification_requests ── animals/profiles (by subject)
```

## Shared types (`@mating/shared`)

- `PaymentProvider`, `PaymentIntentStatus`, `PaymentPurpose`, `PaymentProviderCode`
- `LedgerAccountType`, `LedgerEntryType`, `RefundReasonCode`
- `PayoutStatus`, `BoostOrderStatus`, `SubscriptionStatus`
- `PAYMENT_PROOF_BUCKET = 'payment-proofs'`

## Audit events (M5)

- `payment.intent_created`, `payment.proof_uploaded`, `payment.confirmed`,
  `payment.reconciled`, `payment.refunded`
- `payout.requested`, `payout.approved`, `payout.released`
- `boost.purchased`, `subscription.created`, `subscription.cancel_scheduled`
- `verification.request_submitted`, `admin.document_accessed` (proof view)
- `webhook.received`, `webhook.duplicate_ignored`
