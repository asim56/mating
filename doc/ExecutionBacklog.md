# ExecutionBacklog.md

## Purpose & Status

This is the PR-by-PR execution backlog for the Pakistan-first, USA-ready verified breeding marketplace. It decomposes `doc/ImplementationPlan.md` (milestones M0-M7, the module catalog, and the per-task acceptance criteria) into discrete, reviewable work items sized for delivery.

- **Derives from, does not supersede.** `doc/ImplementationPlan.md` remains the engineering-execution source of truth for scope, dependencies, estimates, and acceptance criteria. This file is the operational queue used to schedule and ship that scope. If a task's scope changes, update `ImplementationPlan.md` first, then reflect it here.
- Companion documents remain authoritative for their domains: `.cursor/Context.md` / `doc/IntegrationGuide.md` (architecture and schema), `doc/Features.md` (product contract), `.cursor/Rule.md` (business/compliance/privacy/audit), `doc/Integration.md` (provider interfaces), `doc/Skill.md` (specialist-review triggers).
- This is a planning artifact only. It contains no production code, SQL, or configuration.

## How to Use This Document

1. Execute top-to-bottom following the [Global PR Sequence](#global-pr-sequence). The sequence is acyclic: every item's dependencies appear earlier.
2. Apply migrations in the order given by [Migration Order](#migration-order). A `[DB]` migration always merges before the `[BE]` PR that reads or writes its tables.
3. Every PR inherits the global Definition of Done in `Claude.md` (compiles, lint/typecheck/test pass, OpenAPI updated, reversible migration, RLS/RBAC considered, audit events emitted, UI states handled) in addition to the per-item Tests listed below.
4. Do not start a milestone until its [Review Checkpoint](#review-checkpoints) entry criteria are met and all upstream modules are merged.
5. Schedule specialist review (per `doc/Skill.md`) before opening the first PR of any High-risk module: `audit`, `breeding-requests`, `payments`, `wallet-ledger`, `verification`.

### Work-item ID scheme

`M<milestone>-<MODULE>-<seq>` — e.g. `M1-USERS-03`. Dependencies reference these IDs directly so the backlog stays traceable and acyclic.

### Layer tags

| Tag | Meaning | Primary paths |
| --- | --- | --- |
| `[DB]` | Migration and/or seed | `supabase/migrations/`, `supabase/seed.sql`, `supabase/policies/` |
| `[SHARED]` | Cross-layer contracts | `packages/shared/`, `packages/config/`, `packages/database/` |
| `[BE]` | Backend module/endpoint | `apps/api/src/modules/<module>/`, `apps/api/src/common/` |
| `[FE]` | Frontend | `apps/web/app/`, `apps/web/features/`, `apps/web/components/`, `packages/ui/` |
| `[INFRA]` | CI / Docker / docs | `.github/workflows/`, `docker/`, `doc/`, `README.md` |
| `[TEST]` | Test-only PR | `apps/api/test/`, `apps/web/**/*.test.ts(x)`, `packages/**/*.test.ts` |

Backend and frontend always ship as separate PRs. Cross-cutting emitters (`audit`/`analytics`/`notifications`) are wired into producing modules as explicit `[BE]` tasks, never bundled into an unrelated domain PR.

### PR-size legend

Line counts include implementation plus tests added in the same PR.

| Size | Lines | Rule |
| --- | --- | --- |
| XS | < 100 | — |
| S | 100-250 | — |
| M | 250-500 | Target ceiling for a normal PR |
| L | 500-800 | Allowed only when noted; must be justified or split |
| (split) | > ~500 projected | Hard rule: split into migration / base / sub-feature / FE / test PRs |

When a `[BE]` feature plus its tests would exceed ~500 lines, the tests move to a dedicated `[TEST]` PR that depends on the feature PR.

### Per-work-item shape

Each item lists: **ID** `[layer]` Task — **Files**: paths to create — **Deps**: work-item IDs and external dependencies — **Size**: XS/S/M/L (~lines) — **Tests**: gating tests.

## Global PR Sequence

Execute in this order. Items on the same line are independent and may run in parallel; later milestones assume all earlier ones are merged. Cross-cutting wiring (`*-WIRE-*`) ships with or just after its producing module.

```text
M0  → SYS-01 SYS-02 → PLAT-01 PLAT-02 PLAT-03 → PLAT-04 PLAT-05 → WEB-01 WEB-02 → DEVOPS-01 DEVOPS-02 DEVOPS-03
M1  → SHARED-01
      REGIONS-01 → REGIONS-02 → REGIONS-03
      BREEDS-01 → BREEDS-02
      AUDIT-01 → AUDIT-02
      ANALYTICS-01
      IDENTITY-01 → IDENTITY-02 IDENTITY-03 → IDENTITY-04
      USERS-01 → USERS-02 → USERS-03 USERS-04 → USERS-05
      NOTIF-01 → NOTIF-02 → NOTIF-03
M2  → ANIMALS-01 → ANIMALS-02 → ANIMALS-03 → ANIMALS-FE-01
      HEALTH-01 → HEALTH-02
      PEDIGREE-01 → PEDIGREE-02
      VERIF-01 → VERIF-FE-01
M3  → MKT-01 → MKT-02 → MKT-03
      MATCH-01 → MATCH-02
      MKT-FE-01 MATCH-FE-01
M4  → BREQ-01 (SHARED enum) → BREQ-02 → BREQ-03 → BREQ-04 → BREQ-05 BREQ-06
      MSG-01 → MSG-02 → MSG-03
      NOTIF-WIRE-01
      BREQ-FE-01 MSG-FE-01
M5  → PAY-01 → PAY-02 → PAY-03 → PAY-04 → PAY-05 PAY-06
      LEDGER-01 → LEDGER-02 → LEDGER-03
      VERIF-02
      PAY-FE-01 ADMIN-FE-01
M6  → VERIF-03 → VERIF-FE-02
      BREQ-07 → BREQ-FE-02
      REVIEW-01 → REVIEW-02 → REVIEW-FE-01
      ADMIN-01 → ADMIN-02 → ADMIN-FE-02
M7  → QA-01 QA-02 → SEC-01 SEC-02 → OBS-01 → DR-01 DR-02
```

## Migration Order

Single ordered list of every `supabase/migrations/*` file, the milestone it lands in, and what depends on it. The existing `supabase/migrations/20250620000000_foundation.sql` (extensions + `set_updated_at()`) is the baseline; all timestamps below follow it. `[grant]` items revoke `UPDATE`/`DELETE` to enforce append-only tables at the database layer (per `.cursor/Rule.md` immutable ledger/audit rules).

| # | Migration file | Milestone | Item | Depended on by |
| --- | --- | --- | --- | --- |
| 0 | `20250620000000_foundation.sql` (exists) | — | baseline | everything |
| 1 | `20250701000000_regions.sql` | M1 | REGIONS-01 | breeds, profiles, listings, all region-scoped tables |
| 2 | `20250701000100_breeds.sql` | M1 | BREEDS-01 | animals |
| 3 | `20250701000200_profiles_user_roles.sql` | M1 | USERS-01 | every owned/sensitive table, RLS |
| 4 | `20250701000300_notification_preferences_consents.sql` | M1 | USERS-05 | notifications delivery, consent audit |
| 5 | `20250701000400_audit_logs.sql` + `[grant]` | M1 | AUDIT-01 | all audited actions |
| 6 | `20250701000500_analytics_events.sql` | M1 | ANALYTICS-01 | analytics capture, dashboards |
| 7 | `20250701000600_outbox_notifications_devices.sql` | M1 | NOTIF-01 | drainer, workflow notifications |
| 8 | `20250715000000_animals.sql` | M2 | ANIMALS-01 | animal_media, health, pedigree, listings, breeding_requests |
| 9 | `20250715000100_animal_media.sql` | M2 | ANIMALS-03 | media read/upload |
| 10 | `20250715000200_health_records.sql` | M2 | HEALTH-01 | verification (health dim) |
| 11 | `20250715000300_pedigree_records.sql` | M2 | PEDIGREE-01 | verification (pedigree dim) |
| 12 | `20250715000400_verification_requests.sql` | M2 | VERIF-01 | verification queue/workflow |
| 13 | `20250801000000_listings.sql` | M3 | MKT-01 | saved_listings, matching, breeding_requests, boosts |
| 14 | `20250801000100_saved_listings.sql` | M3 | MKT-03 | saved-listing endpoints |
| 15 | `20250801000200_search_vector_trigger.sql` | M3 | MATCH-01 | search endpoint |
| 16 | `20250815000000_breeding_requests_events.sql` | M4 | BREQ-02 | transitions, records, disputes, messaging, reviews |
| 17 | `20250815000100_breeding_records.sql` | M4 | BREQ-05 | record generation |
| 18 | `20250815000200_disputes.sql` | M4 | BREQ-06 | dispute resolution (M6) |
| 19 | `20250815000300_conversations_messages.sql` | M4 | MSG-01 | messaging, masking, reports |
| 20 | `20250901000000_payment_intents_webhook_events.sql` | M5 | PAY-01 | intents, webhooks, ledger |
| 21 | `20250901000100_subscription_plans_subscriptions.sql` | M5 | PAY-05 | subscription endpoints |
| 22 | `20250901000200_boost_orders.sql` | M5 | PAY-06 | boost purchase, listing visibility |
| 23 | `20250901000300_ledger_entries.sql` + `[grant]` | M5 | LEDGER-01 | payouts, reconciliation |
| 24 | `20250901000400_payout_accounts_payouts.sql` | M5 | LEDGER-02 | payout endpoints, admin release |
| 25 | `20250915000000_reviews.sql` | M6 | REVIEW-01 | reputation, moderation |

> Reversibility: every migration ships with a tested down path (or a documented forward-only justification for the `[grant]` append-only tables). CI gate `DEVOPS-01` enforces migration validity before merge.

## M0 — Foundation

Goal: close foundation gaps so feature work can start cleanly. Entry: current scaffold. Exit: app boots end-to-end with CI gates, test harness, RTL shell, and corrected docs.

### Module: `system`

Feature: Health & build info

- **SYS-01** `[BE]` Add build/version + DB readiness ping to `GET /api/v1/health` — **Files**: `apps/api/src/modules/health/health.service.ts` (extend), `apps/api/src/modules/health/dto/health-response.dto.ts` — **Deps**: none — **Size**: S (~120) — **Tests**: `apps/api/test/health.test.ts` (ok with version; 503 when DB unreachable).
- **SYS-02** `[INFRA]` Confirm Swagger at `/docs` with `/api/v1` prefix + export OpenAPI JSON — **Files**: `apps/api/src/openapi/openapi.config.ts`, `apps/api/src/openapi/export-openapi.ts` — **Deps**: SYS-01 — **Size**: S (~150) — **Tests**: smoke test that `/docs` renders and JSON exports.

### Module: platform (`apps/api/src/common`)

Feature: Global API conventions

- **PLAT-01** `[BE]` Global validation pipe + DTO whitelist + error filter with stable `ApiErrorBody` codes — **Files**: `apps/api/src/common/filters/all-exceptions.filter.ts`, `apps/api/src/common/errors/api-error.ts`, `apps/api/src/common/errors/error-codes.ts`, `apps/api/src/common/pipes/validation.pipe.ts` — **Deps**: none — **Size**: M (~300) — **Tests**: `apps/api/test/common/error-filter.test.ts` (400 with stable code; unknown fields stripped).
- **PLAT-02** `[BE]` Cursor pagination helper for all list endpoints — **Files**: `apps/api/src/common/pagination/cursor.ts`, `apps/api/src/common/pagination/paginated-response.dto.ts` — **Deps**: none — **Size**: S (~150) — **Tests**: `apps/api/test/common/cursor.test.ts` (`{data, meta:{nextCursor,hasMore}}`).
- **PLAT-03** `[BE]` Rate-limit configuration matrix (auth, search, messaging, request creation) — **Files**: `apps/api/src/common/rate-limit/rate-limit.config.ts`, `apps/api/src/common/rate-limit/rate-limit.guard.ts` — **Deps**: none — **Size**: M (~280) — **Tests**: `apps/api/test/common/rate-limit.test.ts` (429 + retry hint at threshold). Closes missing rate-limit requirement.

Feature: Auth/RBAC scaffolding (no business logic)

- **PLAT-04** `[BE]` JWT validation guard + role guard + ownership policy base class — **Files**: `apps/api/src/common/auth/jwt.guard.ts`, `apps/api/src/common/auth/roles.guard.ts`, `apps/api/src/common/auth/roles.decorator.ts`, `apps/api/src/common/auth/ownership-policy.base.ts` — **Deps**: PLAT-01 — **Size**: M (~320) — **Tests**: `apps/api/test/common/guards.test.ts` (401 missing/invalid JWT; 403 insufficient role).
- **PLAT-05** `[TEST]` RBAC/RLS + state-transition test harness (helpers + fixtures) — **Files**: `apps/api/test/harness/rbac.ts`, `apps/api/test/harness/state-transitions.ts`, `apps/api/test/harness/fixtures.ts` — **Deps**: PLAT-04 — **Size**: M (~350) — **Tests**: one sample role-matrix + transition test passes in CI.

### Module: web (design system)

Feature: RTL + i18n shell

- **WEB-01** `[FE]` Tailwind RTL setup + `dir` switching wired to locale; `en.json`/`ur.json` scaffolding — **Files**: `apps/web/lib/i18n/config.ts`, `apps/web/lib/i18n/provider.tsx`, `apps/web/app/[locale]/layout.tsx`, `apps/web/messages/en.json` (extend), `apps/web/messages/ur.json` (extend) — **Deps**: none — **Size**: M (~360) — **Tests**: `apps/web/lib/i18n/config.test.ts` (locale toggle flips `dir`; no hardcoded copy).
- **WEB-02** `[FE]` Base UI states pattern (loading/empty/error/success) in `packages/ui` — **Files**: `packages/ui/src/states/loading.tsx`, `packages/ui/src/states/empty.tsx`, `packages/ui/src/states/error.tsx`, `packages/ui/src/states/index.ts` — **Deps**: none — **Size**: S (~200) — **Tests**: `packages/ui/src/states/states.test.tsx`.

### Module: devops/docs

Feature: CI gates

- **DEVOPS-01** `[INFRA]` Add migration validation + OpenAPI validation steps to CI — **Files**: `.github/workflows/ci.yml` (extend), `scripts/validate-migrations.sh`, `scripts/validate-openapi.sh` — **Deps**: SYS-02 — **Size**: M (~260) — **Tests**: CI fails on malformed migration / OpenAPI drift (verified in workflow run).
- **DEVOPS-02** `[INFRA]` Resolve API host decision; document in `Setup.md`/`Integration.md` — **Files**: `doc/Setup.md` (edit), `doc/Integration.md` (edit) — **Deps**: none — **Size**: S (~80) — **Tests**: n/a (doc); records `web`->Vercel, `api`->long-running host + webhook/outbox implications.
- **DEVOPS-03** `[INFRA]` Documentation drift fixes (README reading order, DeliveryPlan deprecation pointer) — **Files**: `README.md` (edit), `doc/DeliveryPlan.md` (edit) — **Deps**: none — **Size**: XS (~40) — **Tests**: link check resolves to real paths.

## M1 — Identity & Profiles

Goal: auth, roles, profiles, region/breed config, cross-cutting cores. Maps to Checkpoint 1. Entry: M0 exit. Exit: email + phone-OTP auth, profile completion, roles; `regions`/`breeds` seeded; `audit`/`analytics`/`notifications` cores + outbox live; RLS baseline; admin can list users.

### Module: `packages/shared`

- **SHARED-01** `[SHARED]` Canonical enums scaffold (roles, verification dimensions, notification channels/categories, region codes) — **Files**: `packages/shared/src/enums/roles.ts`, `packages/shared/src/enums/verification.ts`, `packages/shared/src/enums/notifications.ts`, `packages/shared/src/enums/index.ts` — **Deps**: M0 — **Size**: S (~180) — **Tests**: `packages/shared/src/enums/enums.test.ts`. (Breeding-request status enum added in M4 BREQ-01.)

### Module: `config/regions`

Feature: Region configuration

- **REGIONS-01** `[DB]` `regions` migration + seed PK (PKR, en/ur, Easypaisa/JazzCash/bank) and US (USD, en, Stripe) — **Files**: `supabase/migrations/20250701000000_regions.sql`, `supabase/seed.sql` (extend) — **Deps**: SHARED-01 — **Size**: M (~280) — **Tests**: `apps/api/test/regions/seed.test.ts` (PK + US rows with currency, default locale, active flag, jsonb `config`).
- **REGIONS-02** `[DB]` Eligibility + compliance config in `regions.config` (min age/health by species; PK provincial flags) — **Files**: `supabase/migrations/20250701000000_regions.sql` (same migration, config payload), `packages/shared/src/config/eligibility.ts` (typed accessor) — **Deps**: REGIONS-01 — **Size**: M (~300) — **Tests**: `packages/shared/src/config/eligibility.test.ts` (conservative PK defaults readable). Closes eligibility-data gap.
- **REGIONS-03** `[BE]` Admin region read/update endpoint — **Files**: `apps/api/src/modules/regions/regions.controller.ts`, `regions.service.ts`, `regions.repository.ts`, `dto/update-region.dto.ts`, `policies/region.policy.ts`, `events/region-updated.event.ts`, `regions.module.ts` — **Deps**: REGIONS-02, PLAT-04, AUDIT-02 — **Size**: M (~320) — **Tests**: read/update by admin emits audit; non-admin 403.

### Module: `breeds`

Feature: Breed taxonomy

- **BREEDS-01** `[DB]` `breeds` migration + seed priority PK breeds (cattle, buffalo, goat, sheep, dog) — **Files**: `supabase/migrations/20250701000100_breeds.sql`, `supabase/seed.sql` (extend) — **Deps**: REGIONS-01 — **Size**: S (~220) — **Tests**: `apps/api/test/breeds/seed.test.ts` (unique (species, name, region); region link).
- **BREEDS-02** `[BE]` Admin breed taxonomy management — **Files**: `apps/api/src/modules/breeds/breeds.controller.ts`, `breeds.service.ts`, `breeds.repository.ts`, `dto/`, `policies/breed.policy.ts`, `events/breed-changed.event.ts`, `breeds.module.ts` — **Deps**: BREEDS-01, PLAT-04, AUDIT-02 — **Size**: M (~300) — **Tests**: add/edit audited; non-admin 403.

### Module: `audit` (cross-cutting core, High risk)

Feature: Append-only audit log

- **AUDIT-01** `[DB]` `audit_logs` migration + DB grants revoking UPDATE/DELETE — **Files**: `supabase/migrations/20250701000400_audit_logs.sql`, `supabase/policies/audit_logs.sql` — **Deps**: M0 — **Size**: M (~260) — **Tests**: `apps/api/test/audit/append-only.test.ts` (UPDATE/DELETE rejected at DB level).
- **AUDIT-02** `[BE]` Audit emitter (interceptor/service) + event catalog — **Files**: `apps/api/src/modules/audit/audit.service.ts`, `audit.interceptor.ts`, `audit.repository.ts`, `events/audit-event.catalog.ts`, `audit.module.ts` — **Deps**: AUDIT-01 — **Size**: M (~360) — **Tests**: privileged actions emit rows with actor/subject/ip/ua; missing audit events fail tests.

### Module: `analytics` (cross-cutting core)

Feature: Event ingestion

- **ANALYTICS-01** `[DB+BE]` `analytics_events` migration + capture service with privacy filters; emit `user_signed_up` — **Files**: `supabase/migrations/20250701000500_analytics_events.sql`, `apps/api/src/modules/analytics/analytics.service.ts`, `analytics.repository.ts`, `events/event-names.ts`, `analytics.module.ts` — **Deps**: M0 — **Size**: M (~340) — **Tests**: `apps/api/test/analytics/privacy.test.ts` (no private health/payment/identity payloads stored).

### Module: `identity`

Feature: Authentication

- **IDENTITY-01** `[BE]` Supabase Auth integration: email/password + phone OTP (PK format) — **Files**: `apps/api/src/modules/identity/identity.controller.ts`, `identity.service.ts`, `identity.repository.ts`, `dto/`, `identity.module.ts` — **Deps**: PLAT-04, REGIONS-01 — **Size**: M (~400) — **Tests**: `apps/api/test/identity/auth.test.ts` (PK-OTP signup; email/password; JWT validated). External dep: Pakistan SMS deliverability.
- **IDENTITY-02** `[BE]` Add email after phone signup; optional social login hook — **Files**: `apps/api/src/modules/identity/email-link.service.ts`, `dto/link-email.dto.ts` — **Deps**: IDENTITY-01 — **Size**: S (~180) — **Tests**: phone-first user attaches email.
- **IDENTITY-03** `[BE]` Account recovery + session/device tracking — **Files**: `apps/api/src/modules/identity/sessions.service.ts`, `sessions.repository.ts`, `dto/recover-account.dto.ts` — **Deps**: IDENTITY-01 — **Size**: M (~320) — **Tests**: recover account; active sessions/devices tracked.
- **IDENTITY-04** `[BE]` Admin force-logout (session revocation) endpoint — **Files**: `apps/api/src/modules/identity/admin-sessions.controller.ts`, `policies/session.policy.ts`, `events/sessions-revoked.event.ts` — **Deps**: IDENTITY-03, PLAT-04, AUDIT-02 — **Size**: S (~160) — **Tests**: `POST /api/v1/admin/users/:id/revoke-sessions` invalidates + audits. Closes session-revocation gap.

### Module: `users`

Feature: Profiles & roles

- **USERS-01** `[DB]` `profiles`, `user_roles` migrations + RLS (owner read/write own) — **Files**: `supabase/migrations/20250701000200_profiles_user_roles.sql`, `supabase/policies/profiles.sql` — **Deps**: IDENTITY-01, REGIONS-01 — **Size**: M (~340) — **Tests**: `apps/api/test/users/rls.test.ts` (RLS blocks cross-owner reads).
- **USERS-02** `[BE]` `POST /auth/profile`, `GET/PATCH /me` — **Files**: `apps/api/src/modules/users/users.controller.ts`, `users.service.ts`, `users.repository.ts`, `dto/`, `entities/profile.entity.ts`, `policies/profile.policy.ts`, `users.module.ts` — **Deps**: USERS-01, AUDIT-02 — **Size**: M (~400) — **Tests**: profile completion enforces required fields; `/me` returns user/roles/permissions; updates audited.
- **USERS-03** `[BE]` Role assignment + Field Onboarding Rep as scoped Support variant — **Files**: `apps/api/src/modules/users/roles.controller.ts`, `roles.service.ts`, `policies/field-rep.policy.ts`, `events/role-changed.event.ts` — **Deps**: USERS-02, PLAT-04, AUDIT-02 — **Size**: M (~360) — **Tests**: admin assigns roles (audited); Field Rep can assist w/ consent + attribution, blocked from payments/disputes. Closes Field-Rep RBAC decision.
- **USERS-04** `[BE]` Admin user search + suspend/reactivate — **Files**: `apps/api/src/modules/users/admin-users.controller.ts`, `admin-users.service.ts`, `dto/list-users.dto.ts`, `events/account-status-changed.event.ts` — **Deps**: USERS-02, PLAT-02, AUDIT-02 — **Size**: M (~360) — **Tests**: `GET /admin/users` paginates/searches; suspend blocks listings/requests + audits.
- **USERS-05** `[DB+BE]` `notification_preferences`, `consents` migrations + endpoints — **Files**: `supabase/migrations/20250701000300_notification_preferences_consents.sql`, `apps/api/src/modules/users/preferences.controller.ts`, `preferences.service.ts`, `consents.service.ts`, `dto/`, `events/consent-changed.event.ts` — **Deps**: USERS-01, AUDIT-02 — **Size**: M (~420) — **Tests**: per channel/category prefs; marketing opt-in recorded with type+version; consent grant/withdraw audited.

### Module: `notifications` (cross-cutting core)

Feature: Outbox + delivery

- **NOTIF-01** `[DB]` `outbox_messages` + `notification_logs` + `devices` migrations — **Files**: `supabase/migrations/20250701000600_outbox_notifications_devices.sql` — **Deps**: M0 — **Size**: M (~300) — **Tests**: `apps/api/test/notifications/outbox-schema.test.ts` (outbox row in same txn as state change). Closes outbox gap.
- **NOTIF-02** `[BE]` Scheduled outbox drainer + `NotificationProvider` stub (email/SMS/push) + localized template lookup — **Files**: `apps/api/src/modules/notifications/outbox.drainer.ts`, `notifications.service.ts`, `providers/notification.provider.ts`, `providers/stub.provider.ts`, `templates/template.registry.ts`, `notifications.module.ts` — **Deps**: NOTIF-01 — **Size**: L (~520, split if needed: drainer vs provider) — **Tests**: idempotent delivery, retries, en/ur template lookup. Provider interface per `doc/Integration.md`.
- **NOTIF-03** `[BE]` Device token register/remove + preference enforcement — **Files**: `apps/api/src/modules/notifications/devices.controller.ts`, `devices.service.ts`, `dto/` — **Deps**: NOTIF-02, USERS-05 — **Size**: S (~200) — **Tests**: disabled categories not delivered; transactional categories non-optional.

## M2 — Animal Supply

Goal: animal profiles, media, health, pedigree, passive verification badges. Maps to Checkpoint 2. Entry: M1 exit. Exit: owners/breeders create animals with media + health + pedigree; badges visible default unverified.

### Module: `animals`

Feature: Animal profile CRUD (L module — split into migration / base / media / FE)

- **ANIMALS-01** `[DB]` `animals` migration (all `Features.md` fields) + RLS (owner manage own; soft delete) — **Files**: `supabase/migrations/20250715000000_animals.sql`, `supabase/policies/animals.sql` — **Deps**: USERS-01, BREEDS-01, REGIONS-01 — **Size**: M (~360) — **Tests**: `apps/api/test/animals/rls.test.ts` (cross-owner write blocked; `deleted_at` hides records).
- **ANIMALS-02** `[BE]` `POST/GET/PATCH/DELETE /animals` + draft/publish state + eligibility validation — **Files**: `apps/api/src/modules/animals/animals.controller.ts`, `animals.service.ts`, `animals.repository.ts`, `dto/`, `entities/animal.entity.ts`, `policies/animal.policy.ts`, `events/animal-changed.event.ts`, `animals.module.ts` — **Deps**: ANIMALS-01, AUDIT-02, ANALYTICS-01 — **Size**: L (~480) — **Tests**: publish blocked until eligibility fields present (species, breed, sex, location, declaration, min-age, health-not-blocked, >=1 image); `animal_created` emitted; changes audited. Eligibility per REGIONS-02.
- **ANIMALS-03** `[DB+BE]` `animal_media` migration + signed upload URL endpoint + visibility — **Files**: `supabase/migrations/20250715000100_animal_media.sql`, `apps/api/src/modules/animals/media.controller.ts`, `media.service.ts`, `providers/storage.provider.ts` (consume `packages/shared`), `dto/upload-url.dto.ts` — **Deps**: ANIMALS-02 — **Size**: M (~400) — **Tests**: `POST /animals/:id/media/upload-url` owner-scoped; private media requires signed read URL; sort order. `StorageProvider` per `doc/Integration.md` (`animal-media` bucket).

Feature: Animal management UI

- **ANIMALS-FE-01** `[FE]` Animal create/edit/list screens (draft+publish, media upload, eligibility surfacing) — **Files**: `apps/web/features/animals/animal-form.tsx`, `apps/web/features/animals/animal-list.tsx`, `apps/web/features/animals/use-animals.ts`, `apps/web/app/[locale]/animals/page.tsx`, `apps/web/app/[locale]/animals/[id]/edit/page.tsx` — **Deps**: ANIMALS-02, ANIMALS-03, WEB-01, WEB-02 — **Size**: L (~500, split list vs form if needed) — **Tests**: `apps/web/features/animals/animal-form.test.tsx` (loading/empty/error/success; RTL; translation keys).

### Module: `health`

Feature: Clinical records

- **HEALTH-01** `[DB]` `health_records` migration + RLS (private by default) — **Files**: `supabase/migrations/20250715000200_health_records.sql`, `supabase/policies/health_records.sql` — **Deps**: ANIMALS-01 — **Size**: M (~280) — **Tests**: records private to owner/vet/admin; type coverage (vaccination/deworming/disease/fertility/pregnancy/certificate/contraindication).
- **HEALTH-02** `[BE]` `POST /animals/:id/health-records` + signed document URLs + vet linkage — **Files**: `apps/api/src/modules/health/health-records.controller.ts`, `health-records.service.ts`, `health-records.repository.ts`, `dto/`, `policies/health-record.policy.ts`, `events/health-record-created.event.ts`, `health.module.ts` — **Deps**: HEALTH-01, ANIMALS-03 (storage), AUDIT-02 — **Size**: M (~360) — **Tests**: owner/vet adds records; signed URLs (`health-records` bucket); creation audited; readiness settable.

### Module: `pedigree`

Feature: Lineage & registry

- **PEDIGREE-01** `[DB]` `pedigree_records` migration + sire/dam links + registry/DNA documents — **Files**: `supabase/migrations/20250715000300_pedigree_records.sql`, `supabase/policies/pedigree_records.sql` — **Deps**: ANIMALS-01 — **Size**: M (~260) — **Tests**: manual offline lineage stored; self-referential sire/dam valid; registry name/number + document path captured.
- **PEDIGREE-02** `[BE]` `POST /animals/:id/pedigree` endpoint — **Files**: `apps/api/src/modules/pedigree/pedigree.controller.ts`, `pedigree.service.ts`, `pedigree.repository.ts`, `dto/`, `events/pedigree-changed.event.ts`, `pedigree.module.ts` — **Deps**: PEDIGREE-01, ANIMALS-03 (storage), AUDIT-02 — **Size**: S (~220) — **Tests**: owner adds pedigree; default `verification_status = unverified`; change audited.

### Module: `verification` (passive badges, High risk)

Feature: Verification badges (display only)

- **VERIF-01** `[DB+BE]` `verification_requests` migration + additive badge model — **Files**: `supabase/migrations/20250715000400_verification_requests.sql`, `apps/api/src/modules/verification/verification.service.ts`, `verification.repository.ts`, `entities/verification.entity.ts`, `verification.module.ts` — **Deps**: ANIMALS-01, HEALTH-01, PEDIGREE-01, SHARED-01 — **Size**: M (~360) — **Tests**: per-dimension status exposed (owner identity, media, health, vaccination, pedigree, facility, vet, inspector); default `unverified`.

Feature: Badge display UI

- **VERIF-FE-01** `[FE]` Verification badge components (never "verified" without dimension) — **Files**: `packages/ui/src/verification/badge.tsx`, `apps/web/features/verification/badges.tsx` — **Deps**: VERIF-01, WEB-01 — **Size**: S (~180) — **Tests**: `packages/ui/src/verification/badge.test.tsx` (bare "verified" never rendered).

## M3 — Discovery

Goal: listings, publish, search/filters, listing detail, SEO, saved listings. Maps to Sprint 3. Entry: M2 exit. Exit: listings publishable and searchable with SEO surfaces and saved listings.

### Module: `marketplace`

Feature: Listings lifecycle (L module — split migration / endpoints / saved)

- **MKT-01** `[DB]` `listings` migration + status enum (draft/pending/active/paused/expired/rejected/suspended) + RLS (active public-readable) — **Files**: `supabase/migrations/20250801000000_listings.sql`, `supabase/policies/listings.sql`, `packages/shared/src/enums/listing-status.ts` — **Deps**: ANIMALS-01 — **Size**: M (~360) — **Tests**: only `active` + non-deleted public; statuses match `Features.md`.
- **MKT-02** `[BE]` `POST /listings`, `PATCH /listings/:id`, `POST /listings/:id/publish` — **Files**: `apps/api/src/modules/marketplace/listings.controller.ts`, `listings.service.ts`, `listings.repository.ts`, `dto/`, `policies/listing.policy.ts`, `events/listing-changed.event.ts`, `marketplace.module.ts` — **Deps**: MKT-01, AUDIT-02, ANALYTICS-01 — **Size**: M (~420) — **Tests**: publish validates listing-type + required fields; publish/unpublish audited; `animal_published`/`listing_viewed` emitted.
- **MKT-03** `[DB+BE]` `saved_listings` migration + `GET/POST/DELETE /saved-listings` — **Files**: `supabase/migrations/20250801000100_saved_listings.sql`, `apps/api/src/modules/marketplace/saved-listings.controller.ts`, `saved-listings.service.ts`, `dto/` — **Deps**: MKT-02 — **Size**: S (~240) — **Tests**: save/unsave idempotent; suspended/soft-deleted excluded; save emits analytics.

### Module: `matching`

Feature: Search & filters (L feature — split trigger/search vs scoring)

- **MATCH-01** `[DB+BE]` `search_vector` trigger + GIN index + cursor-paginated `GET /listings` search — **Files**: `supabase/migrations/20250801000200_search_vector_trigger.sql`, `apps/api/src/modules/matching/matching.controller.ts`, `matching.service.ts`, `matching.repository.ts`, `dto/search-listings.dto.ts`, `matching.module.ts` — **Deps**: MKT-01, PLAT-02 — **Size**: L (~480) — **Tests**: tsvector auto-maintained (no app writes); filters species/breed/sex/location+distance/fee/verification/availability/health/pedigree/method; `search_performed` emitted.
- **MATCH-02** `[BE]` Deterministic compatibility scoring + distance — **Files**: `apps/api/src/modules/matching/scoring.service.ts`, `scoring.weights.ts` — **Deps**: MATCH-01 — **Size**: M (~320) — **Tests**: `apps/api/test/matching/scoring.test.ts` — weights (breed 25, health 20, pedigree 15, distance 15, verification 10, outcomes 10, dispute 5); deterministic tie-break documented.

### Module: web (discovery surfaces)

Feature: SEO & listing detail

- **MKT-FE-01** `[FE]` SSR city/species SEO pages + listing detail page — **Files**: `apps/web/app/[locale]/listings/[city]/[species]/page.tsx`, `apps/web/app/[locale]/listings/[id]/page.tsx`, `apps/web/features/listings/listing-detail.tsx`, `apps/web/features/listings/seo-metadata.ts` — **Deps**: MATCH-01, WEB-01, WEB-02, VERIF-FE-01 — **Size**: L (~480) — **Tests**: structured metadata; localized en/ur RTL; four UI states; no phone numbers on public pages (privacy rule).
- **MATCH-FE-01** `[FE]` Search results + filter panel — **Files**: `apps/web/features/search/search-page.tsx`, `apps/web/features/search/filter-panel.tsx`, `apps/web/features/search/use-search.ts`, `apps/web/app/[locale]/search/page.tsx` — **Deps**: MATCH-01, MATCH-02, WEB-01 — **Size**: M (~420) — **Tests**: `apps/web/features/search/search-page.test.tsx` (filters drive query; empty/loading states).

## M4 — Breeding Workflow

Goal: request lifecycle, records, messaging, notifications. Maps to Checkpoint 3. Entry: M2 + M3 exit. Exit: requests traverse the full state machine, generate records, with masked-phone messaging and workflow notifications. `breeding-requests` is High risk (XL) — split aggressively; schedule specialist review before BREQ-01.

### Module: `breeding-requests`

Feature: Canonical status model

- **BREQ-01** `[SHARED]` Publish breeding-request status enum + transition map in `packages/shared` — **Files**: `packages/shared/src/enums/breeding-request-status.ts`, `packages/shared/src/state/breeding-transitions.ts`, `packages/shared/src/enums/index.ts` (extend) — **Deps**: SHARED-01 — **Size**: S (~220) — **Tests**: `packages/shared/src/state/breeding-transitions.test.ts` — enum `Draft/Requested/Accepted/Rejected/PaymentPending/Scheduled/InProgress/Completed/RecordGenerated/Closed/Cancelled/Disputed/Refunded`; reconciles prior naming mismatch.

Feature: Request lifecycle (split migration / create / transitions / dispute / record)

- **BREQ-02** `[DB]` `breeding_requests` + `breeding_request_events` migrations + RLS (participant/admin only) — **Files**: `supabase/migrations/20250815000000_breeding_requests_events.sql`, `supabase/policies/breeding_requests.sql` — **Deps**: ANIMALS-01, MKT-01, BREQ-01 — **Size**: M (~360) — **Tests**: events row on every status change; RLS blocks non-participants.
- **BREQ-03** `[BE]` `POST /breeding-requests` with eligibility + business-rule validation — **Files**: `apps/api/src/modules/breeding-requests/breeding-requests.controller.ts`, `breeding-requests.service.ts`, `breeding-requests.repository.ts`, `dto/create-request.dto.ts`, `policies/request.policy.ts`, `validators/eligibility.validator.ts`, `events/request-created.event.ts`, `breeding-requests.module.ts` — **Deps**: BREQ-02, REGIONS-02, AUDIT-02, ANALYTICS-01 — **Size**: L (~480) — **Tests**: enforces no self-mating (unless record-only), both accounts active, animals active/not-deleted, opposite-sex for natural, supported method (`natural`/`artificial_insemination`/`semen_purchase`/`record_only`), min age/health; `breeding_request_created` emitted.
- **BREQ-04** `[BE]` Transition endpoints: accept/reject/schedule/complete + guards — **Files**: `apps/api/src/modules/breeding-requests/transitions.controller.ts`, `transitions.service.ts`, `events/request-transitioned.event.ts` — **Deps**: BREQ-03, PLAT-05 — **Size**: L (~460) — **Tests**: each transition validated against state map + RBAC (accept only by recipient); illegal transitions rejected; transitions audited + event-logged; state-transition tests pass.
- **BREQ-05** `[DB+BE]` `breeding_records` migration + `POST /breeding-requests/:id/record` (idempotent) — **Files**: `supabase/migrations/20250815000100_breeding_records.sql`, `apps/api/src/modules/breeding-requests/records.controller.ts`, `records.service.ts`, `events/record-generated.event.ts` — **Deps**: BREQ-04 — **Size**: M (~360) — **Tests**: completing generates exactly one record (unique per request); captures animals/owners/method/date/location/vet refs/outcome; `record_generated` emitted; regeneration idempotent (idempotency key per `.cursor/Rule.md`).
- **BREQ-06** `[DB+BE]` Dispute open + `disputes` migration (resolution deferred to M6) — **Files**: `supabase/migrations/20250815000200_disputes.sql`, `apps/api/src/modules/breeding-requests/disputes.controller.ts`, `disputes.service.ts`, `dto/open-dispute.dto.ts`, `events/dispute-opened.event.ts` — **Deps**: BREQ-04, AUDIT-02 — **Size**: M (~320) — **Tests**: `POST /breeding-requests/:id/dispute` with reason code; request -> `Disputed`; `dispute_opened` emitted.

Feature: Request workflow UI

- **BREQ-FE-01** `[FE]` Request create + lifecycle dashboard (status timeline, transition actions) — **Files**: `apps/web/features/requests/request-form.tsx`, `apps/web/features/requests/request-detail.tsx`, `apps/web/features/requests/status-timeline.tsx`, `apps/web/features/requests/use-requests.ts`, `apps/web/app/[locale]/requests/page.tsx`, `apps/web/app/[locale]/requests/[id]/page.tsx` — **Deps**: BREQ-03, BREQ-04, BREQ-05, WEB-01, WEB-02 — **Size**: L (~520, split form vs detail) — **Tests**: `apps/web/features/requests/request-detail.test.tsx` (allowed transitions reflect state; four UI states; RTL).

### Module: `messaging`

Feature: Conversations & messages (split migration / endpoints / masking / report)

- **MSG-01** `[DB]` `conversations`, `conversation_participants`, `messages` migrations + RLS (participants/support) — **Files**: `supabase/migrations/20250815000300_conversations_messages.sql`, `supabase/policies/conversations.sql` — **Deps**: BREQ-02, MKT-01 — **Size**: M (~340) — **Tests**: only participants/support read; conversation tied to request or listing.
- **MSG-02** `[BE]` `GET/POST` messages (paginated) + attachments via signed URLs — **Files**: `apps/api/src/modules/messaging/messaging.controller.ts`, `messaging.service.ts`, `messaging.repository.ts`, `dto/`, `policies/conversation.policy.ts`, `messaging.module.ts` — **Deps**: MSG-01, ANIMALS-03 (storage), PLAT-02 — **Size**: M (~420) — **Tests**: pagination; attachments use signed URLs; non-participant 403.
- **MSG-03** `[BE]` Phone-number masking + reveal rule + report message + support freeze — **Files**: `apps/api/src/modules/messaging/masking.service.ts`, `report.controller.ts`, `report.service.ts`, `events/message-reported.event.ts` — **Deps**: MSG-02, BREQ-04 — **Size**: M (~340) — **Tests**: `apps/api/test/messaging/masking.test.ts` — phone numbers hidden until linked request reaches `Accepted`/`Scheduled` (or regional policy); `POST /messages/:id/report`; support freezes disputed conversation. Closes masking-rule gap.

Feature: Chat UI

- **MSG-FE-01** `[FE]` In-app chat (conversation list, thread, attachments, read receipts) — **Files**: `apps/web/features/messaging/conversation-list.tsx`, `apps/web/features/messaging/thread.tsx`, `apps/web/features/messaging/use-messages.ts`, `apps/web/app/[locale]/messages/page.tsx` — **Deps**: MSG-02, MSG-03, WEB-01 — **Size**: L (~480) — **Tests**: `apps/web/features/messaging/thread.test.tsx` (masked phone display; RTL; states).

### Module: `notifications` (workflow wiring)

Feature: Workflow notifications

- **NOTIF-WIRE-01** `[BE]` Emit outbox messages on request/record/message events (localized) — **Files**: `apps/api/src/modules/notifications/workflow-emitters.ts`, `templates/breeding/*.ts` (en/ur) — **Deps**: NOTIF-02, BREQ-04, BREQ-05, MSG-02 — **Size**: M (~340) — **Tests**: key transitions enqueue localized email/SMS/push per prefs; transactional categories always delivered; delivery logged.

## M5 — Payments & Trust

Goal: payments, ledger, monetization, reconciliation. Maps to Checkpoint 4. Entry: M4 exit; API host resolved (DEVOPS-02). Exit: payment intents, proofs, provider adapters/stubs, immutable ledger, protected-payment states, boosts/subscriptions, admin reconciliation, audited. `payments` + `wallet-ledger` are High risk (XL/L) — specialist review required before PAY-01 and LEDGER-01.

### Module: `payments`

Feature: Payment intents & providers (split migration / intents / webhook / proof)

- **PAY-01** `[DB]` `payment_intents` + `webhook_events` migrations + idempotency keys — **Files**: `supabase/migrations/20250901000000_payment_intents_webhook_events.sql`, `supabase/policies/payment_intents.sql`, `packages/shared/src/enums/payment-status.ts` — **Deps**: BREQ-04, M4 exit — **Size**: M (~360) — **Tests**: unique (provider, idempotency_key); `webhook_events` dedups provider events. Closes webhook-dedup gap.
- **PAY-02** `[BE]` `POST /payments/intents` for deposit/full/boost/subscription purposes — **Files**: `apps/api/src/modules/payments/payments.controller.ts`, `payments.service.ts`, `payments.repository.ts`, `dto/create-intent.dto.ts`, `providers/payment.provider.ts` (consume `packages/shared`), `events/payment-initiated.event.ts`, `payments.module.ts` — **Deps**: PAY-01, AUDIT-02, ANALYTICS-01 — **Size**: M (~420) — **Tests**: intent maps to purpose + request/payee; `payment_initiated` emitted; protected-payment states represented; client status never trusted.
- **PAY-03** `[BE]` Provider webhook handler (signature-verified, idempotent) + Easypaisa/JazzCash adapters or stubs — **Files**: `apps/api/src/modules/payments/webhook.controller.ts`, `webhook.service.ts`, `providers/easypaisa.adapter.ts`, `providers/jazzcash.adapter.ts`, `providers/bank-transfer.adapter.ts`, `events/payment-confirmed.event.ts` — **Deps**: PAY-02 — **Size**: L (~520, split handler vs adapters) — **Tests**: `POST /payments/:provider/webhook` verifies signature, dedups via `webhook_events`, transitions intent; unverified rejected; `payment_confirmed` emitted. External dep: Easypaisa/JazzCash merchant approval (stubs first).
- **PAY-04** `[BE]` Bank-transfer proof upload — **Files**: `apps/api/src/modules/payments/proof.controller.ts`, `proof.service.ts`, `dto/upload-proof.dto.ts` — **Deps**: PAY-02, ANIMALS-03 (storage), AUDIT-02 — **Size**: S (~200) — **Tests**: `POST /payments/:id/proof` stores private proof (`payment-proofs` bucket, signed URL); proof access audited.

Feature: Subscriptions & boosts

- **PAY-05** `[DB+BE]` `subscription_plans`, `subscriptions` migrations + endpoints — **Files**: `supabase/migrations/20250901000100_subscription_plans_subscriptions.sql`, `apps/api/src/modules/payments/subscriptions.controller.ts`, `subscriptions.service.ts`, `dto/` — **Deps**: PAY-02 — **Size**: M (~360) — **Tests**: plans listed per region; subscribe/cancel-at-period-end; status tracked.
- **PAY-06** `[DB+BE]` `boost_orders` migration + `POST /listings/:id/boost` purchase — **Files**: `supabase/migrations/20250901000200_boost_orders.sql`, `apps/api/src/modules/payments/boosts.controller.ts`, `boosts.service.ts`, `dto/` — **Deps**: PAY-02, MKT-02 — **Size**: M (~320) — **Tests**: boost purchase creates order + intent (idempotent); active boost affects visibility window.

### Module: `wallet-ledger` (High risk)

Feature: Immutable ledger

- **LEDGER-01** `[DB]` `ledger_entries` migration + DB grants revoking UPDATE/DELETE — **Files**: `supabase/migrations/20250901000300_ledger_entries.sql`, `supabase/policies/ledger_entries.sql` — **Deps**: PAY-01 — **Size**: M (~280) — **Tests**: `apps/api/test/ledger/append-only.test.ts` (entries insert-only; UPDATE/DELETE rejected at DB level).

Feature: Payouts

- **LEDGER-02** `[DB+BE]` `payout_accounts`, `payouts` migrations + endpoints (idempotent) + admin approve/release — **Files**: `supabase/migrations/20250901000400_payout_accounts_payouts.sql`, `apps/api/src/modules/wallet-ledger/wallet-ledger.controller.ts`, `wallet-ledger.service.ts`, `wallet-ledger.repository.ts`, `payouts.controller.ts`, `policies/payout.policy.ts`, `events/payout-changed.event.ts`, `wallet-ledger.module.ts` — **Deps**: LEDGER-01, PAY-03, AUDIT-02 — **Size**: L (~480) — **Tests**: every confirmed payment writes balanced ledger entries; payout unique (provider, idempotency_key); `POST /admin/payouts/:id/approve` releases + audits.
- **LEDGER-03** `[BE]` Admin reconciliation + refund (reason code) — **Files**: `apps/api/src/modules/wallet-ledger/reconciliation.controller.ts`, `reconciliation.service.ts`, `refund.service.ts`, `events/payment-reconciled.event.ts`, `events/refund-initiated.event.ts` — **Deps**: LEDGER-02, PAY-03 — **Size**: M (~360) — **Tests**: `POST /admin/payments/:id/reconcile` + `POST /admin/payments/:id/refund` write ledger entries + audit; refund requires reason code; revenue never from provider dashboards only.

### Module: `verification` (queue surface)

Feature: Verification request + queue

- **VERIF-02** `[BE]` `POST /verifications` + `GET /admin/verifications` queue — **Files**: `apps/api/src/modules/verification/verification.controller.ts`, `admin-verification.controller.ts`, `dto/submit-verification.dto.ts`, `policies/verification.policy.ts` — **Deps**: VERIF-01, PLAT-02, PLAT-04 — **Size**: M (~320) — **Tests**: users submit by dimension; admin queue paginates pending (approve/reject in M6).

### Module: web (payments/admin surfaces)

- **PAY-FE-01** `[FE]` Checkout/payment screens (intent, bank-proof upload, subscription/boost purchase) — **Files**: `apps/web/features/payments/checkout.tsx`, `apps/web/features/payments/proof-upload.tsx`, `apps/web/features/payments/use-payments.ts`, `apps/web/app/[locale]/payments/page.tsx` — **Deps**: PAY-02, PAY-04, PAY-05, PAY-06, WEB-01 — **Size**: L (~480) — **Tests**: `apps/web/features/payments/checkout.test.tsx` (no provider secrets in browser; states; RTL).
- **ADMIN-FE-01** `[FE]` Admin reconciliation + verification queue UI — **Files**: `apps/web/features/admin/reconciliation.tsx`, `apps/web/features/admin/verification-queue.tsx`, `apps/web/app/[locale]/admin/payments/page.tsx`, `apps/web/app/[locale]/admin/verifications/page.tsx` — **Deps**: LEDGER-03, VERIF-02, WEB-01 — **Size**: M (~420) — **Tests**: reconciliation/refund flows; queue pagination.

## M6 — Trust & Admin

Goal: vet/inspector workflows, dispute resolution, reviews, moderation, audit explorer, dashboards. Maps to Checkpoint 5 (partial). Entry: M5 exit. Exit: trust workflows operational; admin can moderate, resolve, and observe.

### Module: `verification` (active workflows, High risk)

Feature: Approval workflows

- **VERIF-03** `[BE]` `POST /admin/verifications/:id/approve|reject` + vet/inspector scoped actions — **Files**: `apps/api/src/modules/verification/approval.controller.ts`, `approval.service.ts`, `policies/vet-inspector.policy.ts`, `events/verification-approved.event.ts` — **Deps**: VERIF-02, AUDIT-02 — **Size**: L (~460) — **Tests**: admin approve/reject; vet verifies health-only, inspector evidence-only (per `Features.md` RBAC matrix); approval updates subject dimension + emits `verification_approved` + audit.

Feature: Verification workflow UI

- **VERIF-FE-02** `[FE]` Vet/inspector verification screens + evidence review — **Files**: `apps/web/features/verification/review.tsx`, `apps/web/features/verification/use-verification.ts`, `apps/web/app/[locale]/verifications/page.tsx` — **Deps**: VERIF-03, WEB-01 — **Size**: M (~360) — **Tests**: scoped actions reflect role; evidence uses signed URLs.

### Module: `breeding-requests` (dispute resolution, High risk)

Feature: Dispute resolution

- **BREQ-07** `[BE]` `GET /admin/disputes`, `GET /disputes/:id`, assign + resolve with reason/resolution codes — **Files**: `apps/api/src/modules/breeding-requests/dispute-resolution.controller.ts`, `dispute-resolution.service.ts`, `dto/resolve-dispute.dto.ts`, `events/dispute-resolved.event.ts` — **Deps**: BREQ-06, LEDGER-03 (refund), AUDIT-02 — **Size**: L (~440) — **Tests**: support assigns + resolves; resolution can trigger refund via payments; negative reputation withheld until support review; open/resolve audited.

Feature: Dispute UI

- **BREQ-FE-02** `[FE]` Dispute detail + resolution (support) UI — **Files**: `apps/web/features/disputes/dispute-detail.tsx`, `apps/web/features/disputes/use-disputes.ts`, `apps/web/app/[locale]/admin/disputes/page.tsx` — **Deps**: BREQ-07, WEB-01 — **Size**: M (~340) — **Tests**: assign/resolve flows; reason/resolution codes required.

### Module: `reviews`

Feature: Ratings & reputation

- **REVIEW-01** `[DB+BE]` `reviews` migration + `POST /reviews` (post-completion only) + edit window — **Files**: `supabase/migrations/20250915000000_reviews.sql`, `supabase/policies/reviews.sql`, `apps/api/src/modules/reviews/reviews.controller.ts`, `reviews.service.ts`, `reviews.repository.ts`, `dto/`, `policies/review.policy.ts`, `events/review-created.event.ts`, `reviews.module.ts` — **Deps**: BREQ-05 (completion), AUDIT-02 — **Size**: M (~420) — **Tests**: one review per reviewer per request; only after eligible completed request (or support exception); rating 1-5; emits audit-relevant event.
- **REVIEW-02** `[BE]` Reputation surfacing + moderation — **Files**: `apps/api/src/modules/reviews/reputation.service.ts`, `moderation.controller.ts`, `moderation.service.ts`, `events/review-moderated.event.ts` — **Deps**: REVIEW-01 — **Size**: M (~340) — **Tests**: reputation weights verification + completion over raw stars; `POST /admin/reviews/:id/moderate` approve/hide; hidden/soft-deleted excluded; dispute-influenced flagged.

Feature: Reviews UI

- **REVIEW-FE-01** `[FE]` Review submission + reputation display — **Files**: `apps/web/features/reviews/review-form.tsx`, `apps/web/features/reviews/reputation-card.tsx`, `apps/web/features/reviews/use-reviews.ts` — **Deps**: REVIEW-01, REVIEW-02, WEB-01, VERIF-FE-01 — **Size**: M (~300) — **Tests**: review only after completion; reputation surfaces badges + completion.

### Module: `admin`

Feature: Moderation & support tooling

- **ADMIN-01** `[BE]` Content reports + listing/animal suspension + support queue — **Files**: `apps/api/src/modules/admin/moderation.controller.ts`, `moderation.service.ts`, `reports.repository.ts`, `policies/support.policy.ts`, `events/content-moderated.event.ts`, `admin.module.ts` — **Deps**: MKT-02, MSG-02, AUDIT-02 — **Size**: L (~460) — **Tests**: support suspends listing immediately for fraud/cruelty/disease/illegal; exotic listings require category approval; actions audited (per `.cursor/Rule.md` abuse/safety).
- **ADMIN-02** `[BE]` Audit log explorer (admin-scoped) + analytics dashboards — **Files**: `apps/api/src/modules/admin/audit-explorer.controller.ts`, `audit-explorer.service.ts`, `dashboards.controller.ts`, `dashboards.service.ts` — **Deps**: AUDIT-02, ANALYTICS-01, PLAT-02 — **Size**: L (~480) — **Tests**: audit queries filter by actor/action/subject; dashboards show revenue, active breeders/owners, search-to-request, completion rate, dispute rate, verification throughput, boost/subscription conversion; admin document access audited.

Feature: Admin UI

- **ADMIN-FE-02** `[FE]` Moderation queue + audit explorer + dashboards UI — **Files**: `apps/web/features/admin/moderation-queue.tsx`, `apps/web/features/admin/audit-explorer.tsx`, `apps/web/features/admin/dashboards.tsx`, `apps/web/app/[locale]/admin/page.tsx` — **Deps**: ADMIN-01, ADMIN-02, WEB-01 — **Size**: L (~480) — **Tests**: filters drive queries; charts render from dashboard API; states/RTL.

## M7 — Launch Hardening

Goal: QA, security, performance, observability, DR, retention, seed supply, beta. Maps to Checkpoint 5 (completion). Entry: M6 exit. Exit: production-ready per `Setup.md` launch checklist.

### Module: QA & compliance

Feature: Test coverage

- **QA-01** `[TEST]` RBAC + animal-ownership + breeding-state-transition + ledger-consistency + verification/audit-event coverage — **Files**: `apps/api/test/coverage/rbac.matrix.test.ts`, `apps/api/test/coverage/ownership.test.ts`, `apps/api/test/coverage/state-transitions.test.ts`, `apps/api/test/coverage/ledger-consistency.test.ts`, `apps/api/test/coverage/audit-events.test.ts` — **Deps**: all modules, PLAT-05 — **Size**: XL (split per concern) — **Tests**: every role-gated + state-transition path covered; CI enforces (per `Agent.md`).

Feature: Compliance & retention

- **QA-02** `[BE+INFRA]` Data-retention periods per data class + right-to-erasure flow — **Files**: `apps/api/src/modules/users/erasure.controller.ts`, `erasure.service.ts`, `doc/Setup.md` (retention table) — **Deps**: USERS-02, AUDIT-01, LEDGER-01 — **Size**: M (~400) — **Tests**: erasure soft-deletes/redacts personal identifiers while retaining legally required financial/audit records; retention documented per data class. Closes retention gap.

### Module: security & performance

Feature: Security review

- **SEC-01** `[INFRA/TEST]` RLS review, signed-URL expiry, CORS, webhook signatures, secret isolation, PII scrubbing — **Files**: `doc/SecurityChecklist.md`, `apps/api/test/security/rls-review.test.ts`, `apps/api/test/security/signed-url-expiry.test.ts` — **Deps**: all modules — **Size**: L (~500) — **Tests**: `Setup.md` security checklist satisfied; service role server-only; Sentry PII scrubbing + PostHog privacy filters enabled.
- **SEC-02** `[TEST]` Performance checks (search latency, query latency, upload failures) — **Files**: `apps/api/test/perf/search.bench.ts`, `apps/api/test/perf/queries.bench.ts` — **Deps**: MATCH-01, ANIMALS-03 — **Size**: M (~300) — **Tests**: search + key endpoints meet target latency under seed load; slow queries indexed.

### Module: devops & observability

Feature: Observability & alerts

- **OBS-01** `[INFRA]` Logs/metrics/alerts per `Setup.md` (payment webhook failures, error rate, auth/storage outages, suspicious admin activity) — **Files**: `apps/api/src/common/observability/logger.ts`, `apps/api/src/common/observability/metrics.ts`, `docker/alerts/*.yml`, `doc/Setup.md` (edit) — **Deps**: all modules, PAY-03 — **Size**: L (~460) — **Tests**: alert fires in a staged failure test.

Feature: DR & launch readiness

- **DR-01** `[TEST/INFRA]` Restore test + payment webhook-replay test + full breeding-request smoke — **Files**: `apps/api/test/dr/restore.test.ts`, `apps/api/test/dr/webhook-replay.test.ts`, `apps/api/test/dr/breeding-smoke.test.ts` — **Deps**: LEDGER-01, PAY-03, backups — **Size**: L (~440) — **Tests**: restore into staging succeeds; replayed webhooks idempotent (no duplicate ledger entries); end-to-end breeding workflow smoke passes.
- **DR-02** `[DB+INFRA]` Seed supply + beta instrumentation — **Files**: `supabase/seed.sql` (extend: verified breeders/animals), `apps/web/lib/analytics/funnel.ts` — **Deps**: ANIMALS-02, MKT-02, ANALYTICS-01 — **Size**: M (~320) — **Tests**: seed verified breeders/animals for launch liquidity; beta funnel events visible on dashboards.

## Testing Backlog

Per `.cursor/Rule.md` ("add tests for state transitions, permissions, and payment flows") and the `Agent.md` rule that no feature ships without role + state-transition tests, every feature PR carries its gating tests inline (listed under each item's **Tests**). Tests are split into a dedicated `[TEST]` PR only when they would push a feature PR past ~500 lines. This section lists the cross-cutting test work beyond per-item tests.

### Per-milestone test gates

| Milestone | Mandatory test gates (in addition to per-item tests) |
| --- | --- |
| M0 | Guard/role unit tests (PLAT-04); RBAC + state-transition harness sample passes (PLAT-05); CI fails on bad migration/OpenAPI (DEVOPS-01). |
| M1 | Append-only audit enforced at DB (AUDIT-01); analytics privacy filter (ANALYTICS-01); RLS owner-isolation on `profiles` (USERS-01); consent versioning (USERS-05). |
| M2 | Animal RLS cross-owner block (ANIMALS-01); publish-eligibility validation (ANIMALS-02); private health-record access (HEALTH-01); signed-URL scoping (ANIMALS-03). |
| M3 | tsvector auto-maintained, no app writes (MATCH-01); deterministic scoring weights (MATCH-02); saved-listing idempotency (MKT-03); no phone on public pages (MKT-FE-01). |
| M4 | Full breeding state-transition matrix (BREQ-04); idempotent record generation (BREQ-05); phone masking reveal rule (MSG-03); participant-only conversation RLS (MSG-01). |
| M5 | Webhook signature + dedup/idempotency (PAY-03); append-only ledger (LEDGER-01); balanced ledger entries on confirm (LEDGER-02); refund reason-code required (LEDGER-03). |
| M6 | Vet/inspector scoped verification (VERIF-03); dispute resolve + refund trigger (BREQ-07); one-review-per-request (REVIEW-01); reputation weighting (REVIEW-02); immediate suspension (ADMIN-01). |
| M7 | Consolidated coverage suites (QA-01); erasure vs financial-retention (QA-02); security checklist (SEC-01); latency under seed load (SEC-02); restore + webhook-replay idempotency (DR-01). |

### Dedicated test PRs (large suites)

- **PLAT-05** — RBAC/RLS + state-transition harness (M0).
- **QA-01** — consolidated RBAC, ownership, state-transition, ledger-consistency, audit-event suites (M7, split per concern).
- **SEC-01 / SEC-02** — security checklist + performance benchmarks (M7).
- **DR-01** — restore, webhook-replay, breeding smoke (M7).

## Review Checkpoints

Two checkpoint types: **milestone gates** (entry/exit from `doc/ImplementationPlan.md`) and **specialist gates** (High-risk modules per `doc/Skill.md`). Do not open the first PR of a milestone until its predecessor's exit gate passes.

### Milestone gates

| Gate | Must be merged | Must be reviewed before exit |
| --- | --- | --- |
| CP-M0 | SYS-*, PLAT-*, WEB-*, DEVOPS-* | App boots end-to-end; CI gates live; RTL shell renders; API host decision recorded; docs drift fixed. |
| CP-M1 | SHARED-01, REGIONS-*, BREEDS-*, IDENTITY-*, USERS-*, AUDIT-*, ANALYTICS-01, NOTIF-* | Email + phone-OTP auth; profile completion + roles; RLS baseline; audit/analytics/notifications cores + outbox running; admin can list users. |
| CP-M2 | ANIMALS-*, HEALTH-*, PEDIGREE-*, VERIF-01, VERIF-FE-01 | Animal CRUD + media + health + pedigree; signed URLs; passive badges default unverified. |
| CP-M3 | MKT-*, MATCH-*, MKT-FE-01, MATCH-FE-01 | Listings publishable + searchable; SEO surfaces; saved listings; no phone on public pages; discovery analytics. |
| CP-M4 | BREQ-01..06, MSG-*, NOTIF-WIRE-01, BREQ-FE-01, MSG-FE-01 | Full state machine + events + records; masked-phone messaging; workflow notifications. |
| CP-M5 | PAY-*, LEDGER-*, VERIF-02, PAY-FE-01, ADMIN-FE-01 | Intents/proofs/webhooks; immutable ledger; protected-payment states; boosts/subscriptions; admin reconciliation; all audited. |
| CP-M6 | VERIF-03, BREQ-07, REVIEW-*, ADMIN-*, *-FE-* | Vet/inspector workflows; dispute resolution; reviews/reputation; moderation; audit explorer; dashboards. |
| CP-M7 | QA-*, SEC-*, OBS-01, DR-* | Coverage thresholds; security + performance review; observability + alerts; restore + webhook-replay; retention policy; seed supply; beta instrumentation. Production-ready per `Setup.md`. |

### Specialist gates (schedule before the first PR of each)

| Module | Trigger items | Reviewer focus |
| --- | --- | --- |
| `audit` (High) | AUDIT-01, AUDIT-02 | Append-only DB grants; complete coverage of privileged actions in the event catalog. |
| `breeding-requests` (High) | BREQ-01..07 | State-machine correctness; RLS participant isolation; idempotent record generation; dispute-to-refund path. |
| `payments` (High) | PAY-01..06 | Webhook signature verification; idempotency keys; no client-trusted status; provider abstraction (no SDK leakage into domain). |
| `wallet-ledger` (High) | LEDGER-01..03 | Append-only ledger; balanced entries; refund reason codes; revenue not derived solely from provider dashboards. |
| `verification` (High) | VERIF-01..03 | Additive badge model; vet/inspector RBAC scoping; private evidence handling. |

> Legal review (not an engineering gate, but blocking): protected-payment structure must be cleared before CP-M5 exit; USA pet-transaction coverage before any US launch (out of MVP scope). Track in `MarketPlan.md` risk register.

## Checkpoint

This backlog operationalizes `doc/ImplementationPlan.md` into PR-sized work items. When scope, sequencing, or estimates change, update `ImplementationPlan.md` first, then re-derive the affected items here. Keep every PR under ~500 lines, respect module boundaries, ship backend and frontend separately, and never merge a feature PR without its role and state-transition tests.

