# Tasks: Breeding Workflow

**Input**: Design documents from `/specs/004-breeding-workflow/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: State-machine transition tests (allowed + denied), phone masking, idempotent record generation, and outbox-in-transaction tests are **required** per spec SC-002/SC-003/SC-005.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5)
- Include exact file paths in descriptions

## Path Conventions

- API: `apps/api/src/modules/`
- Web: `apps/web/`
- Shared: `packages/shared/src/`
- Migrations: `supabase/migrations/`
- Tests: `apps/api/test/` and `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Module scaffolding and shared test harness wiring

- [X] T001 Register `BreedingRequestsModule` and `MessagingModule` imports in `apps/api/src/app.module.ts`
- [X] T002 [P] Create breeding workflow test fixtures (owners, animals, listing) in `apps/api/test/breeding-workflow/fixtures.ts`
- [X] T003 [P] Add breeding workflow feature barrel export in `apps/web/features/breeding-workflow/index.ts`
- [X] T004 [P] Re-export breeding types and enums from `packages/shared/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Migration, shared state machine, repositories — **MUST complete before user stories**

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create `supabase/migrations/20250803000000_breeding_workflow.sql` with tables, indexes, RLS, and immutability grants per `data-model.md`
- [X] T006 [P] Implement `BREEDING_REQUEST_STATUS` enum and status mapper in `packages/shared/src/enums/breeding-request-status.ts`
- [X] T007 [P] Implement `BREEDING_REQUEST_TRANSITIONS` and `BreedingRequestStateMachine.assertTransition` in `packages/shared/src/state-machine/breeding-request.state-machine.ts`
- [X] T008 [P] Add `BreedingMethod`, `DisputeReasonCode`, and `PHONE_REVEAL_POLICY` in `packages/shared/src/constants/breeding.ts`
- [X] T009 [P] Add `BreedingRequest`, `BreedingRequestEvent`, and `BreedingRecord` types in `packages/shared/src/types/breeding-request.ts`
- [X] T010 Write exhaustive allowed + denied transition matrix tests in `packages/shared/src/state-machine/breeding-request.state-machine.test.ts`
- [X] T011 Scaffold `BreedingRequestsModule` with controller/service/repository providers in `apps/api/src/modules/breeding-requests/breeding-requests.module.ts`
- [X] T012 [P] Scaffold `MessagingModule` with controller/service providers in `apps/api/src/modules/messaging/messaging.module.ts`
- [X] T013 [P] Implement `BreedingRequestsRepository` (CRUD, events insert, record upsert) in `apps/api/src/modules/breeding-requests/breeding-requests.repository.ts`
- [X] T014 Implement eligibility and RBAC policy checks in `apps/api/src/modules/breeding-requests/policies/breeding-request.policy.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Submit and respond to a breeding request (Priority: P1) 🎯 MVP

**Goal**: Requester submits against active listing; recipient accepts or rejects with audited transitions.

**Independent Test**: Create request → `Requested`; recipient accept → `Accepted`; event log + audit rows present; invalid eligibility rejected.

### Tests for User Story 1

- [X] T015 [P] [US1] Contract test for `POST /breeding-requests` in `apps/api/test/breeding-workflow/breeding-requests.create.test.ts`
- [X] T016 [P] [US1] Contract test for accept/reject/cancel in `apps/api/test/breeding-workflow/breeding-requests.respond.test.ts`
- [X] T017 [P] [US1] Eligibility rejection tests (same animal, wrong sex, inactive listing) in `apps/api/test/breeding-workflow/breeding-requests.eligibility.test.ts`

### Implementation for User Story 1

- [X] T018 [P] [US1] Create request DTOs (`CreateBreedingRequestDto`, list/detail responses) in `apps/api/src/modules/breeding-requests/dto/`
- [X] T019 [US1] Implement create, list, and get-with-events in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T020 [US1] Implement accept, reject, and cancel with `assertTransition` in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T021 [US1] Wire CRUD and respond routes in `apps/api/src/modules/breeding-requests/breeding-requests.controller.ts`
- [X] T022 [US1] Append `breeding_request_events` and audit `breeding_request.created` / `breeding_request.status_changed` in service layer
- [X] T023 [P] [US1] Build request list page in `apps/web/app/[locale]/(dashboard)/requests/page.tsx`

**Checkpoint**: User Story 1 independently testable

---

## Phase 4: User Story 2 - Schedule and complete breeding (Priority: P1)

**Goal**: Walk request through schedule → in-progress → complete → idempotent record → close.

**Independent Test**: Full lifecycle to `Closed` with exactly one `breeding_records` row; duplicate record call returns existing.

### Tests for User Story 2

- [X] T024 [P] [US2] Lifecycle contract test (schedule → close) in `apps/api/test/breeding-workflow/breeding-requests.lifecycle.test.ts`
- [X] T025 [P] [US2] Idempotent record generation test (201 then 200, no duplicate rows) in `apps/api/test/breeding-workflow/breeding-records.test.ts`

### Implementation for User Story 2

- [X] T026 [US2] Implement schedule, start, complete, and close transitions in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T027 [US2] Implement idempotent record generator with `request_id` UNIQUE enforcement in `apps/api/src/modules/breeding-requests/breeding-records.service.ts`
- [X] T028 [US2] Wire schedule/start/complete/record/close endpoints in `apps/api/src/modules/breeding-requests/breeding-requests.controller.ts`
- [X] T029 [US2] Enforce `Idempotency-Key` header on `POST /breeding-requests/:id/record` in controller
- [X] T030 [P] [US2] Build request detail + event timeline UI in `apps/web/app/[locale]/(dashboard)/requests/[id]/page.tsx`
- [X] T031 [P] [US2] Build transition action buttons component in `apps/web/features/breeding-workflow/request-actions.tsx`

**Checkpoint**: User Stories 1 and 2 independently testable

---

## Phase 5: User Story 3 - Masked messaging (Priority: P1)

**Goal**: Participants exchange messages; phones masked until `Accepted`/`Scheduled`; non-participants denied.

**Independent Test**: Pre-acceptance message masks phone; post-acceptance reveals per policy; non-participant gets 403.

### Tests for User Story 3

- [X] T032 [P] [US3] Phone masking unit tests (100% pre-acceptance mask rate) in `apps/api/test/messaging/phone-mask.test.ts`
- [X] T033 [P] [US3] Participant RLS and non-participant 403 test in `apps/api/test/messaging/messaging.rls.test.ts`

### Implementation for User Story 3

- [X] T034 [P] [US3] Implement `PhoneMaskService` (E.164 + local PK/US patterns) in `apps/api/src/modules/messaging/phone-mask.service.ts`
- [X] T035 [US3] Implement conversation create, list, and message send with masking-on-write in `apps/api/src/modules/messaging/messaging.service.ts`
- [X] T036 [US3] Wire conversation and message routes in `apps/api/src/modules/messaging/messaging.controller.ts`
- [X] T037 [US3] Implement `POST /messages/:id/report` with audit `message.reported` in `apps/api/src/modules/messaging/messaging.controller.ts`
- [X] T038 [P] [US3] Build messages inbox UI in `apps/web/app/[locale]/(dashboard)/messages/page.tsx`

**Checkpoint**: User Stories 1–3 independently testable

---

## Phase 6: User Story 4 - Open a dispute (Priority: P2)

**Goal**: Participant opens dispute from eligible states; request → `Disputed`; dispute record created.

**Independent Test**: Open from `Scheduled`; illegal state rejected; duplicate open returns 409.

### Tests for User Story 4

- [X] T039 [P] [US4] Dispute open contract test (eligible + denied states) in `apps/api/test/breeding-workflow/disputes.test.ts`

### Implementation for User Story 4

- [X] T040 [US4] Implement dispute open service (create row, transition to `Disputed`, event log) in `apps/api/src/modules/breeding-requests/disputes.service.ts`
- [X] T041 [US4] Wire `POST /breeding-requests/:id/dispute` and `GET /disputes/:id` in `apps/api/src/modules/breeding-requests/breeding-requests.controller.ts`
- [X] T042 [US4] Optional conversation freeze on dispute in `apps/api/src/modules/messaging/messaging.service.ts`
- [X] T043 [US4] Emit audit `breeding_request.dispute_opened` and analytics `dispute_opened` on open

**Checkpoint**: User Story 4 independently testable

---

## Phase 7: User Story 5 - Workflow notifications (Priority: P2)

**Goal**: Key transitions enqueue localized outbox messages in same DB transaction; transactional category bypasses marketing opt-out.

**Independent Test**: Accept transition creates outbox row in same transaction; marketing-opt-out user still receives transactional breeding notification.

### Tests for User Story 5

- [X] T044 [P] [US5] Outbox-in-same-transaction test for accept transition in `apps/api/test/breeding-workflow/notifications.test.ts`
- [X] T045 [P] [US5] Transactional category bypasses marketing opt-out test in `apps/api/test/breeding-workflow/notifications.test.ts`

### Implementation for User Story 5

- [X] T046 [US5] Add en/ur breeding workflow templates (`breeding.request_received`, `breeding.request_accepted`, etc.) in `apps/api/src/modules/notifications/templates/breeding/`
- [X] T047 [US5] Implement `BreedingNotificationProducer` in `apps/api/src/modules/notifications/producers/breeding-notification.producer.ts`
- [X] T048 [US5] Hook notification producer into status transitions in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`

**Checkpoint**: All five user stories independently testable

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Admin routes, analytics, OpenAPI, quickstart validation

- [X] T049 [P] Illegal transition 409 `INVALID_STATE_TRANSITION` integration tests in `apps/api/test/breeding-workflow/state-transitions.test.ts`
- [X] T050 [P] Implement admin conversation freeze `POST /admin/conversations/:id/freeze` in `apps/api/src/modules/messaging/messaging.controller.ts`
- [X] T051 [P] Emit analytics events `breeding_request_created`, `record_generated` in `apps/api/src/modules/breeding-requests/breeding-requests.service.ts`
- [X] T052 [P] Update OpenAPI drift tests for M4 endpoints in `apps/api/test/openapi.test.ts`
- [X] T053 Run quickstart validation scenarios in `specs/004-breeding-workflow/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **BLOCKS all user stories**
- **User Stories (Phase 3–7)**: All depend on Foundational completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete
- US1, US2, US3 are all P1 — implement sequentially or US3 parallel after Foundational if messaging doesn't need US1 data in tests (fixtures provide isolation)
- US4 depends on US2 lifecycle states being implemented
- US5 depends on US1/US2 transition hooks in service layer

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P1)**: After Foundational — extends US1 transitions but independently testable via fixtures
- **US3 (P1)**: After Foundational — independently testable with fixture conversations
- **US4 (P2)**: After US2 schedule/start states exist
- **US5 (P2)**: After US1/US2 service transition hooks

### Within Each User Story

- Tests written first — must FAIL before implementation
- Shared state machine (T007/T010) before service transitions
- Repository before service; service before controller
- Story checkpoint before next priority

### Parallel Opportunities

- T006–T009, T012–T013 (shared types + module scaffolds) in parallel
- US1 tests T015–T017 in parallel
- US2 tests T024–T025 in parallel
- US3 tests T032–T033 and T034 in parallel with T038 web UI
- US4 test T039 parallel with US5 template work T046 once US2 service exists

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
T015: apps/api/test/breeding-workflow/breeding-requests.create.test.ts
T016: apps/api/test/breeding-workflow/breeding-requests.respond.test.ts
T017: apps/api/test/breeding-workflow/breeding-requests.eligibility.test.ts

# Then DTOs + web list in parallel:
# T018: apps/api/src/modules/breeding-requests/dto/
T023: apps/web/app/[locale]/(dashboard)/requests/page.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (state machine + migration critical)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart US1 scenarios
5. Demo request submit/accept flow

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → demo (MVP funnel)
3. US2 → test → demo (completion + records)
4. US3 → test → demo (privacy-safe messaging)
5. US4 + US5 → test → demo (disputes + notifications)
6. Polish → full quickstart green

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational done:
   - Developer A: US1 + US2 (breeding-requests)
   - Developer B: US3 (messaging)
   - Developer C: US5 templates/producer (after US1 transition hooks land)
3. US4 after US2 lifecycle merged

---

## Notes

- Canonical status enum lives in `packages/shared` — API, DB mapper, and tests must import from there
- Migration file: `20250803000000_breeding_workflow.sql` (single migration per data-model)
- `PaymentPending → Scheduled` allowed in M4 for staging without M5 payment intent
- Dispute resolution endpoints are M6 — do not implement in this feature
- Commit after each task or logical group; stop at checkpoints to validate independently
