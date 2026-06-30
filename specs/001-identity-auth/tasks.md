---
description: "Task list for Identity, Profiles & Platform Foundation (M1 + inline M0)"
---

# Tasks: Identity, Profiles & Platform Foundation (M1 + inline M0)

**Input**: Design documents from `/specs/001-identity-auth/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: RBAC/state-transition tests mandated by plan (FR-026) and quickstart.md DoD — included per user story and foundational phases.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US8) on story-phase tasks only
- Every task includes an exact file path

## Phase 1: Setup (M0 — Shared Infrastructure)

**Purpose**: Inline M0 foundation — API conventions, guards, harness, CI gates, i18n shell, UI states, docs.

- [ ] T001 Add `jose` and `@supabase/supabase-js` to `apps/api/package.json`; add browser client to `apps/web/package.json`
- [ ] T002 [P] Add `ADMIN_BOOTSTRAP_IDENTIFIER` and Supabase service-role env keys to `packages/config/src/api.ts`
- [ ] T003 Register stub modules (identity, users, audit, analytics, notifications) in `apps/api/src/app.module.ts`
- [ ] T004 Implement JWKS verifier and wire `JwtAuthGuard` in `apps/api/src/common/auth/jwks-token-verifier.ts` and `apps/api/src/common/auth/jwt.guard.ts`
- [ ] T005 [P] Wire `RolesGuard` and document rate-limit matrix in `apps/api/src/common/auth/roles.guard.ts` and `apps/api/src/common/rate-limit/rate-limit.config.ts`
- [ ] T006 [P] M0 unit tests (error filter, cursor, guards, rate-limit) in `apps/api/test/common/`
- [ ] T007 Extend RBAC + state-transition harness and sample CI test in `apps/api/test/harness/rbac.ts`, `apps/api/test/harness/state-transitions.ts`, and `apps/api/test/harness/harness.sample.test.ts`
- [ ] T008 [P] Verify `[locale]` routing, `dir` switching, and `DataState` primitives in `apps/web/app/[locale]/layout.tsx` and `packages/ui/src/states/index.ts`
- [ ] T009 [P] UI state unit tests in `packages/ui/src/states/states.test.ts`
- [ ] T010 Verify migration + OpenAPI CI gates in `scripts/validate-migrations.sh`, `scripts/validate-openapi.sh`, and `.github/workflows/ci.yml`
- [ ] T011 [P] Document API host in `doc/Setup.md` and fix README drift in `README.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migrations, Supabase infra, shared types, cross-cutting module cores. **No user story work until this phase completes.**

- [ ] T012 Create identity M1 migration (profiles, sessions, account_status, user_roles, consents, notification_preferences, audit_logs, analytics_events, outbox_messages, notification_logs, devices, RLS, audit immutability grants) in `supabase/migrations/20250703000000_identity_m1.sql`
- [ ] T013 [P] Upgrade regions + breeds migrations with PK/US seed in `supabase/migrations/20250701000000_regions.sql` and `supabase/migrations/20250702000000_breeds.sql`
- [ ] T014 Add super_admin bootstrap seed keyed on `ADMIN_BOOTSTRAP_IDENTIFIER` in `supabase/seed.sql`
- [ ] T015 Implement Supabase service-role client in `apps/api/src/infra/supabase/supabase.service.ts`
- [ ] T016 [P] Add auth/session/profile types and OTP/password/role constants in `packages/shared/src/types/index.ts` and `packages/shared/src/constants/index.ts`
- [ ] T017 [P] Align `REGION_DEFINITIONS` with seeded jsonb and add constants unit test in `packages/shared/src/config/eligibility.ts` and `packages/shared/src/constants/auth.test.ts`
- [ ] T018 Implement audit module (emitter + insert-only repository) in `apps/api/src/modules/audit/audit.service.ts` and `apps/api/src/modules/audit/audit.repository.ts`
- [ ] T019 [P] Audit immutability DB test in `apps/api/test/audit/audit.immutability.test.ts`
- [ ] T020 Implement analytics capture with privacy filter in `apps/api/src/modules/analytics/analytics.service.ts`
- [ ] T021 [P] Analytics privacy unit test in `apps/api/test/analytics/analytics.privacy.test.ts`
- [ ] T022 Implement outbox repository, stub drainer, and idempotency test in `apps/api/src/modules/notifications/outbox.repository.ts`, `apps/api/src/modules/notifications/outbox.drainer.ts`, and `apps/api/test/notifications/outbox.drainer.test.ts`
- [ ] T023 Upgrade regions and breeds repositories to Supabase in `apps/api/src/modules/regions/regions.repository.ts` and `apps/api/src/modules/breeds/breeds.repository.ts`
- [ ] T024 Implement `AccountStatusGuard` for suspended-account blocking in `apps/api/src/common/auth/account-status.guard.ts`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Phone-first sign up and sign in (Priority: P1) 🎯 MVP

**Goal**: Pakistan phone-OTP sign-up/sign-in with session issuance, rate limiting, and analytics.

**Independent Test**: Sign up with `+92` phone, verify OTP, confirm session; sign out; sign back in with fresh OTP; no duplicate account.

### Tests for User Story 1

- [ ] T025 [P] [US1] Contract + rate-limit tests for OTP request/verify in `apps/api/test/identity/auth-otp.test.ts`

### Implementation for User Story 1

- [ ] T026 [P] [US1] Create OTP DTOs in `apps/api/src/modules/identity/dto/otp.dto.ts`
- [ ] T027 [US1] Implement Supabase phone-OTP, session mirror, role assignment, and `user_signed_up` analytics in `apps/api/src/modules/identity/identity.service.ts` and `apps/api/src/modules/identity/sessions.repository.ts`
- [ ] T028 [US1] Wire `POST /auth/otp/request` and `POST /auth/otp/verify` in `apps/api/src/modules/identity/identity.controller.ts`
- [ ] T029 [P] [US1] PK phone sign-in page, OTP form, and Supabase browser client in `apps/web/app/[locale]/(auth)/sign-in/page.tsx`, `apps/web/features/auth/otp-form.tsx`, and `apps/web/lib/auth/supabase-client.ts`
- [ ] T030 [US1] Phone OTP i18n keys (en/ur) in `apps/web/messages/en.json` and `apps/web/messages/ur.json`

**Checkpoint**: US1 independently testable — phone-OTP MVP complete.

---

## Phase 4: User Story 2 — US email-first sign up and sign in (Priority: P1)

**Goal**: US-region email/password registration with email verification, login, optional US phone.

**Independent Test**: Register US email/password, verify email, complete session; sign out; sign back in; optional `+1` phone stored without OTP requirement.

### Tests for User Story 2

- [ ] T031 [P] [US2] Contract tests for register/login/email-verify (non-enumeration, uniform 401) in `apps/api/test/identity/auth-email.test.ts`

### Implementation for User Story 2

- [ ] T032 [P] [US2] Create email-auth DTOs in `apps/api/src/modules/identity/dto/email-auth.dto.ts`
- [ ] T033 [US2] Implement email register/verify/login and reject PK-only phone for US visitors in `apps/api/src/modules/identity/identity.service.ts`
- [ ] T034 [US2] Wire register/login/email-verify routes in `apps/api/src/modules/identity/identity.controller.ts`
- [ ] T035 [P] [US2] US sign-up and verify-email pages in `apps/web/app/[locale]/(auth)/sign-up/page.tsx` and `apps/web/app/[locale]/(auth)/verify-email/page.tsx`

**Checkpoint**: US1 and US2 both independently testable.

---

## Phase 5: User Story 3 — Email/password and adding email to phone account (Priority: P2)

**Goal**: Cross-region email/password auth; phone users can add verified email as second credential.

**Independent Test**: Email/password register + login; on phone account add email; both methods authenticate same account; duplicate email rejected.

### Tests for User Story 3

- [ ] T036 [P] [US3] Contract tests for `POST /me/email` conflict and login rate-limit in `apps/api/test/identity/me-email.test.ts`

### Implementation for User Story 3

- [ ] T037 [US3] Implement `POST /me/email` add-email-to-phone flow in `apps/api/src/modules/identity/identity.service.ts` and `apps/api/src/modules/identity/identity.controller.ts`
- [ ] T038 [P] [US3] Add-email settings UI in `apps/web/features/auth/add-email-form.tsx`

**Checkpoint**: Dual-credential accounts work for PK phone + email.

---

## Phase 6: User Story 4 — Profile completion, region, and role (Priority: P2)

**Goal**: Profile completion with region/role binding; GET/PATCH `/me`; public regions/breeds reference data.

**Independent Test**: Complete profile (display name, region, role); GET `/me` shows PKR/USD context; update display name persists.

### Tests for User Story 4

- [ ] T039 [P] [US4] Contract tests for profile completion and `/me` in `apps/api/test/users/profile.test.ts`
- [ ] T040 [P] [US4] RBAC test — self-select cannot assign admin roles in `apps/api/test/users/roles.self-select.test.ts`

### Implementation for User Story 4

- [ ] T041 [US4] Implement profiles repository, completion, and `/me` read/update in `apps/api/src/modules/users/profiles.repository.ts`, `apps/api/src/modules/users/users.service.ts`, and `apps/api/src/modules/users/users.controller.ts`
- [ ] T042 [P] [US4] Public `GET /regions` and `GET /breeds` in `apps/api/src/modules/regions/regions.controller.ts` and `apps/api/src/modules/breeds/breeds.controller.ts`
- [ ] T043 [P] [US4] Profile completion wizard and form in `apps/web/app/[locale]/(auth)/profile/page.tsx` and `apps/web/features/profile/profile-form.tsx`

**Checkpoint**: Profiles and region context available for downstream M2.

---

## Phase 7: User Story 5 — Bilingual shell and locale (Priority: P2)

**Goal**: English/Urdu shell with RTL layout; no hardcoded auth/profile copy.

**Independent Test**: Switch locale en↔ur on auth and profile screens; confirm `dir=rtl` and translated strings.

### Tests for User Story 5

- [ ] T044 [P] [US5] i18n RTL/locale config test in `apps/web/lib/i18n/config.test.ts`

### Implementation for User Story 5

- [ ] T045 [P] [US5] Locale switcher component in `apps/web/components/locale-switcher.tsx`
- [ ] T046 [US5] Complete en/ur auth + profile translation keys in `apps/web/messages/en.json` and `apps/web/messages/ur.json`
- [ ] T047 [P] [US5] Apply RTL utilities to auth/profile forms and wire locale persistence in `apps/web/features/auth/otp-form.tsx`, `apps/web/features/profile/profile-form.tsx`, and `apps/web/lib/i18n/provider.tsx`

**Checkpoint**: PK Urdu RTL usable on all M1 auth/profile screens.

---

## Phase 8: User Story 6 — Notification preferences and marketing consent (Priority: P3)

**Goal**: Per-channel/category preferences; explicit marketing opt-in with versioned consent audit.

**Independent Test**: Disable non-transactional category; opt in/out marketing; consent rows and audit events recorded.

### Tests for User Story 6

- [ ] T048 [P] [US6] Contract tests for notification preferences and consents in `apps/api/test/users/notifications.test.ts`

### Implementation for User Story 6

- [ ] T049 [US6] Implement preferences, consent services, and marketing suppression policy in `apps/api/src/modules/users/users.service.ts`, `apps/api/src/modules/users/users.controller.ts`, and `apps/api/src/modules/notifications/notification.policy.ts`
- [ ] T050 [P] [US6] Notification preferences and marketing consent UI in `apps/web/features/profile/notification-preferences.tsx` and `apps/web/features/profile/marketing-consent.tsx`

**Checkpoint**: Compliant notification prefs before M2 domain events.

---

## Phase 9: User Story 7 — Account recovery and session/device visibility (Priority: P2)

**Goal**: Recovery via verified channel; session list/revoke; logout; global sign-out on recovery.

**Independent Test**: Recover account; prior sessions revoked; list sessions; revoke one; revoked token returns 401 within 1 minute.

### Tests for User Story 7

- [ ] T051 [P] [US7] Recovery non-enumeration and session contract tests in `apps/api/test/identity/recovery-sessions.test.ts`
- [ ] T052 [P] [US7] State-transition (active→revoked) and revocation guard tests in `apps/api/test/identity/sessions.transitions.test.ts`

### Implementation for User Story 7

- [ ] T053 [US7] Implement recovery, session list/revoke, and logout in `apps/api/src/modules/identity/identity.service.ts`, `apps/api/src/modules/identity/sessions.service.ts`, and `apps/api/src/modules/identity/identity.controller.ts`
- [ ] T054 [P] [US7] Recovery page and sessions management UI in `apps/web/app/[locale]/(auth)/recover/page.tsx` and `apps/web/features/auth/sessions-list.tsx`

**Checkpoint**: Recovery and session visibility complete.

---

## Phase 10: User Story 8 — Administrative account and region control (Priority: P2)

**Goal**: Admin suspend/reactivate, force-logout, role grant/revoke, user search, region/breed admin; all audited.

**Independent Test**: Admin suspends user → blocked from protected actions + audit row; reactivate restores; non-admin gets 403.

### Tests for User Story 8

- [ ] T055 [P] [US8] RBAC test — all `/admin/*` reject non-admins in `apps/api/test/identity/admin.rbac.test.ts`
- [ ] T056 [P] [US8] State-transition test account_status active↔suspended in `apps/api/test/identity/account-status.transitions.test.ts`
- [ ] T057 [P] [US8] Audit emitter + admin contract tests in `apps/api/test/audit/audit.emitters.test.ts` and `apps/api/test/identity/admin-users.test.ts`

### Implementation for User Story 8

- [ ] T058 [US8] Implement admin user service and routes in `apps/api/src/modules/identity/admin.service.ts` and `apps/api/src/modules/identity/admin.controller.ts`
- [ ] T059 [US8] Wire suspended-account blocking on protected routes in `apps/api/src/common/auth/account-status.guard.ts`
- [ ] T060 [P] [US8] Admin region and breed endpoints in `apps/api/src/modules/regions/regions.controller.ts` and `apps/api/src/modules/breeds/breeds.controller.ts`
- [ ] T061 [P] [US8] Device registration endpoints in `apps/api/src/modules/notifications/devices.controller.ts`

**Checkpoint**: Full admin control and audit trail for M1 privileged actions.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: OpenAPI export, integration validation, documentation, final CI green.

- [ ] T062 [P] Export OpenAPI and drift test in `apps/api/src/openapi/export-openapi.ts` and `apps/api/test/openapi.test.ts`
- [ ] T063 [P] E2E smoke tests for PK phone and US email journeys in `apps/api/test/identity/e2e-phone-auth.test.ts` and `apps/api/test/identity/e2e-email-auth.test.ts`
- [ ] T064 Run quickstart.md validation scenarios in `specs/001-identity-auth/quickstart.md`
- [ ] T065 [P] Health DB-readiness and doc polish in `apps/api/src/modules/health/health.service.ts` and `doc/ImplementationPlan.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup/M0)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phases 3–10 (User Stories)**: All depend on Phase 2 completion
- **Phase 11 (Polish)**: Depends on desired user stories being complete

### User Story Dependencies

| Story | Priority | Depends on | Notes |
|-------|----------|------------|-------|
| US1 Phone OTP (PK) | P1 | Phase 2 | MVP — no other story required |
| US2 US email-first | P1 | Phase 2 | Parallel with US1 after foundation |
| US3 Email + add-email | P2 | US1 or US2 | Reuses identity service |
| US4 Profile/region/role | P2 | US1 or US2 | Needs authenticated account |
| US5 Locale/RTL shell | P2 | US1/US2 web pages | Can parallel UI i18n with US4 |
| US6 Notification prefs | P3 | US4 | Profile account exists |
| US7 Recovery/sessions | P2 | US1/US2 | Sessions table from US1 |
| US8 Admin control | P2 | US1/US2, audit module | Bootstrap seed from Phase 2 |

### Within Each User Story

1. Tests written first (must fail before implementation)
2. DTOs → services → controllers → web UI
3. Story checkpoint before next priority

### Parallel Opportunities

- All Phase 1–2 tasks marked `[P]` can run in parallel within their phase
- After Phase 2: US1 and US2 can proceed in parallel
- US5 locale work can overlap US4 profile UI once auth pages exist
- Test tasks within a story marked `[P]` can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch US1 tests + parallel implementation:
# apps/api/test/identity/auth-otp.test.ts
# apps/api/src/modules/identity/dto/otp.dto.ts
# apps/web/app/[locale]/(auth)/sign-in/page.tsx
# apps/web/features/auth/otp-form.tsx
# apps/web/lib/auth/supabase-client.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (M0)
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (phone-OTP PK)
4. **STOP and VALIDATE** per quickstart.md US1 scenarios

### Incremental Delivery

1. Setup + Foundational → platform base ready
2. US1 (PK phone) → MVP
3. US2 (US email) → dual geography
4. US4 + US5 → profiles and RTL shell
5. US7 + US8 → recovery and admin trust
6. US3 + US6 → secondary auth paths and notification compliance
7. Polish → CI green, quickstart validated

---

## Notes

- `[P]` = parallelizable (different files, no ordering dependency)
- `[USn]` maps tasks to spec.md user stories for traceability
- Credentials/OTP live in Supabase Auth; domain tables in `public.*` per data-model.md
- All admin writes go through API service-role — no public admin self-service (FR-012a)
- Verify tests fail before implementing corresponding production code
