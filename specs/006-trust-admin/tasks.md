# Tasks: Trust & Admin

**Input**: Design documents from `/specs/006-trust-admin/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: RBAC matrix, dispute state-transition, duplicate-review rejection, search suspension, and audit pagination tests per spec success criteria (SC-001–SC-005).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- API modules: `apps/api/src/modules/`
- Shared types: `packages/shared/src/`
- Migrations: `supabase/migrations/`
- Admin web: `apps/web/app/[locale]/(admin)/`, `apps/web/features/admin/`
- API tests: `apps/api/test/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared enums, constants, and module scaffolding for M6 trust/admin

- [ ] T001 Create shared dispute enums in `packages/shared/src/enums/dispute-resolution.ts` per `contracts/disputes.md`
- [ ] T002 [P] Create shared review status enum in `packages/shared/src/enums/review-status.ts` per `contracts/reviews.md`
- [ ] T003 [P] Create reputation weights and review window constants in `packages/shared/src/constants/reputation-weights.ts` per `research.md` §6
- [ ] T004 [P] Create verification RBAC matrix constant in `packages/shared/src/constants/verification-rbac.ts` per `research.md` §1
- [ ] T005 Scaffold `reviews` NestJS module in `apps/api/src/modules/reviews/reviews.module.ts` and register in `apps/api/src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared services, and RBAC guards that all user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create reviews migration in `supabase/migrations/20250915000000_reviews.sql` per `data-model.md` §`public.reviews`
- [ ] T007 [P] Add verification decision columns migration in `supabase/migrations/20250915000001_verification_decisions.sql` per `data-model.md` §`verification_requests`
- [ ] T008 Extend disputes workflow columns in `supabase/migrations/20250915000002_disputes_workflow.sql` per `data-model.md` §`public.disputes`
- [ ] T009 Implement verification dimension RBAC guard in `apps/api/src/modules/verification/guards/verification-dimension.guard.ts` using `VERIFICATION_RBAC_MATRIX`
- [ ] T010 [P] Implement admin role guard extensions in `apps/api/src/modules/admin/guards/admin-role.guard.ts` for support/vet/inspector/field-rep scopes
- [ ] T011 [P] Create audit redaction helper in `apps/api/src/modules/admin/services/audit-redaction.service.ts` for PII masking per `contracts/admin-audit.md`
- [ ] T012 Wire M5 payments refund client in `apps/api/src/modules/breeding-requests/services/dispute-refund.service.ts` for dispute resolution refund trigger

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Approve animal verification (Priority: P1) 🎯 MVP

**Goal**: Vet/inspector/admin approve or reject verification dimensions with role-scoped RBAC and explicit per-dimension labels

**Independent Test**: Approve health verification as vet; confirm only health dimension updates and `verification.approved` audit event fires; inspector health attempt returns 403

### Tests for User Story 1

- [ ] T013 [P] [US1] Add verification RBAC matrix tests in `apps/api/test/verification/verification-rbac.test.ts` covering all role × dimension pairs (SC-001)
- [ ] T014 [P] [US1] Add verification approve/reject integration tests in `apps/api/test/verification/verification-workflow.test.ts` per `quickstart.md` §US1

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create verification decision DTOs in `apps/api/src/modules/verification/dto/verification-decision.dto.ts`
- [ ] T016 [US1] Implement verification decision service in `apps/api/src/modules/verification/verification-decision.service.ts` updating subject `metadata.verification_dimensions` and audit events
- [ ] T017 [US1] Extend admin verifications controller with approve/reject in `apps/api/src/modules/verification/admin-verifications.controller.ts` per `contracts/verification-workflows.md`
- [ ] T018 [US1] Emit `admin.document_accessed` audit when evidence URLs issued in `apps/api/src/modules/verification/verification-detail.service.ts`
- [ ] T019 [US1] Add verification queue admin page in `apps/web/app/[locale]/(admin)/verifications/page.tsx` with dimension-specific status labels

**Checkpoint**: User Story 1 fully functional — vet health approve, inspector 403 on health, admin reject with audit trail

---

## Phase 4: User Story 2 — Resolve a dispute (Priority: P1)

**Goal**: Support assigns and resolves disputes with resolution codes and optional M5 refund trigger

**Independent Test**: Assign dispute, resolve with `refund_full`, confirm request `Refunded` and refund created; retry resolve on closed dispute returns 400

### Tests for User Story 2

- [ ] T020 [P] [US2] Add dispute state-transition tests in `apps/api/test/breeding-requests/dispute-resolution.test.ts` covering all `resolutionType` paths (SC-002)
- [ ] T021 [P] [US2] Add field-rep forbidden resolve test in `apps/api/test/breeding-requests/dispute-rbac.test.ts` per FR-010

### Implementation for User Story 2

- [ ] T022 [P] [US2] Create dispute admin DTOs in `apps/api/src/modules/breeding-requests/dto/dispute-admin.dto.ts` per `contracts/disputes.md`
- [ ] T023 [US2] Implement dispute admin service in `apps/api/src/modules/breeding-requests/dispute-admin.service.ts` with assign/investigate/resolve state machine
- [ ] T024 [US2] Create disputes admin controller in `apps/api/src/modules/breeding-requests/disputes-admin.controller.ts` with list/detail/assign/resolve endpoints
- [ ] T025 [US2] Integrate refund trigger via `dispute-refund.service.ts` on `refund_full` and `refund_partial` resolution types
- [ ] T026 [US2] Add dispute queue admin page in `apps/web/app/[locale]/(admin)/disputes/page.tsx` with assign and resolve actions

**Checkpoint**: User Story 2 fully functional — dispute lifecycle from open to resolved with correct breeding request terminal state

---

## Phase 5: User Story 3 — Leave a review after breeding (Priority: P2)

**Goal**: Post-completion reviews with uniqueness, edit window, moderation, and reputation surfacing

**Independent Test**: Submit review post-completion; duplicate returns 409; admin hide excludes from `GET /users/:id/reputation`

### Tests for User Story 3

- [ ] T027 [P] [US3] Add duplicate review rejection tests in `apps/api/test/reviews/reviews-uniqueness.test.ts` asserting 0% duplicate success (SC-003)
- [ ] T028 [P] [US3] Add reputation exclusion tests in `apps/api/test/reviews/reputation.service.test.ts` for hidden and flagged reviews

### Implementation for User Story 3

- [ ] T029 [P] [US3] Create review entity and repository in `apps/api/src/modules/reviews/reviews.repository.ts` per `data-model.md`
- [ ] T030 [US3] Implement reviews service in `apps/api/src/modules/reviews/reviews.service.ts` with eligibility, edit window, and dispute-influenced flagging
- [ ] T031 [US3] Create reviews controller in `apps/api/src/modules/reviews/reviews.controller.ts` with POST/PATCH/GET per `contracts/reviews.md`
- [ ] T032 [US3] Implement reputation read model in `apps/api/src/modules/reviews/reputation.service.ts` using `REPUTATION_WEIGHTS` from shared constants
- [ ] T033 [US3] Add review moderation endpoint in `apps/api/src/modules/reviews/reviews-admin.controller.ts` with `POST /admin/reviews/:id/moderate`
- [ ] T034 [US3] Add review moderation queue page in `apps/web/app/[locale]/(admin)/reviews/page.tsx`

**Checkpoint**: User Story 3 fully functional — reviews, moderation, and reputation aggregates exclude hidden content

---

## Phase 6: User Story 4 — Moderate harmful listings (Priority: P2)

**Goal**: Support suspends listings/animals for policy violations with immediate search exclusion and exotic category approval gate

**Independent Test**: Suspend listing; confirm absent from public search within 1 minute; PK exotic without category approval blocked from publish

### Tests for User Story 4

- [ ] T035 [P] [US4] Add suspended listing search exclusion test in `apps/api/test/admin/listing-suspension.test.ts` (SC-004)
- [ ] T036 [P] [US4] Add exotic category approval gate test in `apps/api/test/admin/category-approval.test.ts` per `contracts/moderation.md`

### Implementation for User Story 4

- [ ] T037 [P] [US4] Create moderation DTOs in `apps/api/src/modules/admin/dto/moderation.dto.ts` with `reasonCode` enums
- [ ] T038 [US4] Implement moderation service in `apps/api/src/modules/admin/moderation.service.ts` updating listing/animal/message status fields
- [ ] T039 [US4] Create moderation controller in `apps/api/src/modules/admin/moderation.controller.ts` per `contracts/moderation.md` suspend/unsuspend/approve-category routes
- [ ] T040 [US4] Add moderation queue endpoint in `apps/api/src/modules/admin/moderation.controller.ts` with `GET /admin/moderation/queue`
- [ ] T041 [US4] Add moderation inbox page in `apps/web/app/[locale]/(admin)/moderation/page.tsx`

**Checkpoint**: User Story 4 fully functional — suspension removes from discovery; exotic PK gate enforced

---

## Phase 7: User Story 5 — Audit explorer and dashboards (Priority: P2)

**Goal**: Admin searches audit logs with cursor pagination and views business dashboards without PII leakage

**Independent Test**: Query audit by action prefix; view dashboard metrics under seed load; document access emits `admin.document_accessed`

### Tests for User Story 5

- [ ] T042 [P] [US5] Add audit query pagination and PII redaction tests in `apps/api/test/admin/audit-explorer.test.ts` (SC-005)
- [ ] T043 [P] [US5] Add dashboard summary aggregation tests in `apps/api/test/admin/dashboards.test.ts` verifying no health/payment proof content

### Implementation for User Story 5

- [ ] T044 [P] [US5] Create audit explorer query DTOs in `apps/api/src/modules/admin/dto/audit-query.dto.ts` with cursor pagination
- [ ] T045 [US5] Implement audit explorer service in `apps/api/src/modules/admin/audit-explorer.service.ts` reading `audit_logs` with redaction
- [ ] T046 [US5] Create audit explorer controller in `apps/api/src/modules/admin/audit-explorer.controller.ts` per `contracts/admin-audit.md`
- [ ] T047 [US5] Implement dashboards service in `apps/api/src/modules/admin/dashboards.service.ts` aggregating operational metrics per FR-009
- [ ] T048 [US5] Create dashboards controller in `apps/api/src/modules/admin/dashboards.controller.ts` with `GET /admin/dashboards/summary`
- [ ] T049 [US5] Add audit explorer and dashboard pages in `apps/web/app/[locale]/(admin)/audit/page.tsx` and `apps/web/app/[locale]/(admin)/dashboard/page.tsx`

**Checkpoint**: User Story 5 fully functional — audit search, dashboards, and document access auditing

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Field-rep RBAC, OpenAPI, admin layout, and quickstart validation

- [ ] T050 Implement field onboarding rep scoped actions with 403 on payments/payouts/dispute resolve in `apps/api/src/modules/admin/field-rep.policy.ts` per FR-010
- [ ] T051 [P] Update OpenAPI spec with M6 admin/trust routes in `apps/api/openapi.yaml`
- [ ] T052 [P] Add shared admin layout and navigation in `apps/web/features/admin/AdminNav.tsx` linking verification, disputes, reviews, moderation, audit, dashboard
- [ ] T053 Run `quickstart.md` validation scenarios for US1–US5 and fix any gaps in implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–7)**: All depend on Foundational completion
  - US1 and US2 (P1) should complete before US3–US5 (P2) for MVP
  - US3–US5 can proceed in parallel after Foundational if staffed
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational — uses M5 refund client from T012
- **User Story 3 (P2)**: Can start after Foundational — independent of US1/US2
- **User Story 4 (P2)**: Can start after Foundational — independent of other stories
- **User Story 5 (P2)**: Can start after Foundational — reads M1 `audit_logs`; benefits from US1–US4 audit events existing

### Within Each User Story

- Tests before or alongside implementation per team preference; RBAC tests should pass before merge
- DTOs before services; services before controllers; API before admin web pages
- Story complete before moving to next priority

### Parallel Opportunities

- T002, T003, T004 (shared enums/constants) in parallel
- T007, T008 (migrations) in parallel after T006
- T010, T011 (guards/redaction) in parallel
- After Foundational: US1 and US2 can run in parallel by different developers
- US3, US4, US5 can run in parallel after Foundational (or after P1 stories for MVP sequencing)
- Within each story: tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests together:
Task T013: verification RBAC tests in apps/api/test/verification/verification-rbac.test.ts
Task T014: workflow integration tests in apps/api/test/verification/verification-workflow.test.ts

# Launch DTOs while tests are written:
Task T015: DTOs in apps/api/src/modules/verification/dto/verification-decision.dto.ts
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (verification workflows)
4. Complete Phase 4: User Story 2 (dispute resolution)
5. **STOP and VALIDATE**: Run `quickstart.md` §US1 and §US2
6. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Test independently → Deploy (verification loop closed)
3. US2 → Test independently → Deploy (dispute resolution live)
4. US3 → Reviews and reputation
5. US4 → Content moderation
6. US5 → Audit explorer and dashboards
7. Polish → Field-rep RBAC, OpenAPI, admin nav

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: User Story 1 (verification)
- Developer B: User Story 2 (disputes)
- Developer C: User Story 3 (reviews) or User Story 4 (moderation)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to spec user story for traceability
- Reputation is a derived read model — no `reputation_summaries` table at MVP
- Field Onboarding Rep: read-only user assistance only; 403 on payment/dispute routes
- Retention periods for audit/reviews deferred to M7 (`007-launch-hardening`)
