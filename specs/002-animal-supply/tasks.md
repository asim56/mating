# Tasks: Animal Supply

**Input**: Design documents from `/specs/002-animal-supply/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md, research.md

**Tests**: Constitution-mandated RBAC, eligibility, and audit coverage included per spec acceptance scenarios.

**Organization**: Tasks grouped by user story (US1–US5) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1–US5) on story-phase tasks only
- Include exact file paths in descriptions

## Path Conventions

- **API**: `apps/api/src/modules/`
- **Web**: `apps/web/`
- **Shared**: `packages/shared/src/`
- **Migrations**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold domain modules and shared types for M2 animal supply.

- [x] T001 Create `AnimalsModule` scaffold (`module`, `controller`, `service`, `repository`) in `apps/api/src/modules/animals/`
- [x] T002 [P] Create `AnimalHealthModule` scaffold in `apps/api/src/modules/animal-health/` (clinical domain; distinct from `modules/health` liveness)
- [x] T003 [P] Create `PedigreeModule` scaffold in `apps/api/src/modules/pedigree/`
- [x] T004 [P] Create `VerificationModule` scaffold in `apps/api/src/modules/verification/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, shared contracts, storage, RLS, and audit wiring — **blocks all user stories**.

**⚠️ CRITICAL**: No user story work until this phase is complete.

- [x] T005 Create migration `supabase/migrations/20250801000000_animal_supply.sql` with `animals`, `animal_media`, `health_records`, `pedigree_records` tables per `data-model.md`
- [x] T006 [P] Add RLS policies and storage bucket policies (`animal-media`, `health-records`, `pedigree-documents`) in `supabase/migrations/20250801000000_animal_supply.sql`
- [x] T007 [P] Add shared types `AnimalBreedingStatus`, `VerificationDimension`, `HealthRecordType` in `packages/shared/src/types/animal.ts`
- [x] T008 [P] Add `ANIMAL_PUBLISH_READY_REQUIREMENTS` and `VERIFICATION_DIMENSIONS` constants in `packages/shared/src/constants/animal.ts`
- [x] T009 Implement `AnimalEligibilityService` reading `getRegionConfig()` for min-age and health rules in `packages/shared/src/services/animal-eligibility.ts`
- [x] T010 Implement `SupabaseStorageProvider` signed upload/read URL helpers for owner-scoped paths in `apps/api/src/infra/storage/supabase-storage.provider.ts`
- [x] T011 Register `AnimalsModule`, `AnimalHealthModule`, `PedigreeModule`, `VerificationModule` in `apps/api/src/app.module.ts`
- [x] T012 Wire audit event emitters for `animal.updated`, `animal.publish_ready`, `animal.soft_deleted` in `apps/api/src/modules/animals/events/`

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Register an animal draft (Priority: P1) 🎯 MVP

**Goal**: Signed-in owners create, read, update draft animals visible only to them.

**Independent Test**: Create draft, leave and return; partial data persisted; animal not publicly visible; non-owner edit refused.

### Tests for User Story 1

- [x] T013 [P] [US1] RBAC integration test: non-owner `PATCH`/`DELETE` returns `403` in `apps/api/test/animals/rbac.test.ts`
- [x] T014 [P] [US1] Integration test: `POST /animals` → draft, `GET /animals` lists owner animals in `apps/api/test/animals/draft.test.ts`

### Implementation for User Story 1

- [x] T015 [P] [US1] Implement `AnimalsRepository` with owner-scoped queries and soft-delete filter in `apps/api/src/modules/animals/animals.repository.ts`
- [x] T016 [P] [US1] Create DTOs (`CreateAnimalDto`, `UpdateAnimalDto`, `AnimalResponseDto`, `ListAnimalsQueryDto`) in `apps/api/src/modules/animals/dto/`
- [x] T017 [US1] Implement `AnimalsService` create/read/update with audit on update in `apps/api/src/modules/animals/animals.service.ts`
- [x] T018 [US1] Implement `AnimalsController` `POST /animals`, `GET /animals`, `GET /animals/:id`, `PATCH /animals/:id` in `apps/api/src/modules/animals/animals.controller.ts`
- [x] T019 [US1] Build owner draft list and create/edit forms in `apps/web/app/[locale]/(dashboard)/animals/` and `apps/web/features/animals/`

**Checkpoint**: User Story 1 independently testable.

---

## Phase 4: User Story 2 — Publish-ready animal with media (Priority: P1)

**Goal**: Owners complete eligibility, upload ≥1 image via signed URLs, and mark animal publish-ready.

**Independent Test**: Publish-ready granted when complete; blocked with actionable errors when missing fields; non-owner media access refused.

### Tests for User Story 2

- [x] T020 [P] [US2] Eligibility unit tests for min-age, declaration, image count, blocked health in `packages/shared/test/animal-eligibility.test.ts`
- [x] T021 [P] [US2] Integration test: `POST /animals/:id/publish-ready` success and `400` missing-fields in `apps/api/test/animals/publish-ready.test.ts`

### Implementation for User Story 2

- [x] T022 [P] [US2] Implement `AnimalMediaRepository` in `apps/api/src/modules/animals/animal-media.repository.ts`
- [x] T023 [US2] Implement `POST /animals/:id/media/upload-url` and `GET /animals/:id/media` with signed URLs in `apps/api/src/modules/animals/animals.controller.ts`
- [x] T024 [US2] Implement publish-ready gate calling `AnimalEligibilityService` in `apps/api/src/modules/animals/animals.service.ts`
- [x] T025 [US2] Implement `POST /animals/:id/publish-ready` with audit `animal.publish_ready` in `apps/api/src/modules/animals/animals.controller.ts`
- [x] T026 [US2] RBAC test: non-owner `POST /animals/:id/media/upload-url` returns `403` in `apps/api/test/animals/media-rbac.test.ts`
- [x] T027 [US2] Build media upload flow (signed URL + confirm) in `apps/web/features/animals/media-upload.tsx`
- [x] T028 [US2] Build publish-ready checklist UI with validation feedback in `apps/web/features/animals/publish-ready-form.tsx`

**Checkpoint**: User Stories 1 and 2 independently testable.

---

## Phase 5: User Story 3 — Health and pedigree records (Priority: P2)

**Goal**: Owners and authorized vets add clinical health records; owners add pedigree with default `unverified` status.

**Independent Test**: Add vaccination and pedigree with document; records private; vet attribution on health-only actions.

### Tests for User Story 3

- [x] T029 [P] [US3] RBAC test: vet can `POST` health record, cannot `POST` pedigree in `apps/api/test/animal-health/rbac.test.ts`
- [x] T030 [P] [US3] Integration test: health record create/list and pedigree `verificationStatus: unverified` in `apps/api/test/animal-health/health-pedigree.test.ts`

### Implementation for User Story 3

- [x] T031 [P] [US3] Implement `AnimalHealthRepository` and `AnimalHealthService` in `apps/api/src/modules/animal-health/`
- [x] T032 [US3] Implement `POST/GET /animals/:id/health-records` and `POST .../read-url` in `apps/api/src/modules/animal-health/animal-health.controller.ts`
- [x] T033 [P] [US3] Implement `PedigreeRepository` and `PedigreeService` with sire/dam circular-reference validation in `apps/api/src/modules/pedigree/`
- [x] T034 [US3] Implement `POST/GET /animals/:id/pedigree` in `apps/api/src/modules/pedigree/pedigree.controller.ts`
- [x] T035 [US3] Build health record and pedigree forms in `apps/web/features/animals/health-records.tsx` and `apps/web/features/animals/pedigree-form.tsx`

**Checkpoint**: User Stories 1–3 independently testable.

---

## Phase 6: User Story 4 — Verification badges on profiles (Priority: P2)

**Goal**: Per-dimension verification status displayed; all default `unverified`; never bare "verified".

**Independent Test**: New animal shows each dimension separately as `unverified`; partial evidence does not imply full verification.

### Tests for User Story 4

- [x] T036 [P] [US4] Test `GET /animals/:id/verification` returns all dimensions `unverified` for new animal in `apps/api/test/verification/dimensions.test.ts`

### Implementation for User Story 4

- [x] T037 [US4] Initialize `metadata.verification_dimensions` map on animal create in `apps/api/src/modules/animals/animals.service.ts`
- [x] T038 [US4] Implement `VerificationService` read model in `apps/api/src/modules/verification/verification.service.ts`
- [x] T039 [US4] Implement `GET /animals/:id/verification` in `apps/api/src/modules/verification/verification.controller.ts`
- [x] T040 [US4] Build `VerificationBadges` component with per-dimension labels in `apps/web/features/animals/verification-badges.tsx`

**Checkpoint**: User Stories 1–4 independently testable.

---

## Phase 7: User Story 5 — Soft delete and welfare block (Priority: P3)

**Goal**: Owners soft-delete animals; blocked health status prevents publish-ready.

**Independent Test**: Soft-deleted animal excluded from active lists but in audit trail; blocked health rejects publish-ready.

### Tests for User Story 5

- [x] T041 [P] [US5] Test `DELETE /animals/:id` soft-delete excludes from `GET /animals` active list in `apps/api/test/animals/soft-delete.test.ts`
- [x] T042 [P] [US5] Test `health_status: blocked` rejects publish-ready in `apps/api/test/animals/welfare-block.test.ts`

### Implementation for User Story 5

- [x] T043 [US5] Implement soft-delete with audit `animal.soft_deleted` in `apps/api/src/modules/animals/animals.service.ts`
- [x] T044 [US5] Implement `DELETE /animals/:id` in `apps/api/src/modules/animals/animals.controller.ts`
- [x] T045 [US5] Enforce suspended-owner cannot create or publish-ready in `apps/api/src/modules/animals/policies/animal.policy.ts`
- [x] T046 [US5] Build delete confirmation flow in `apps/web/features/animals/delete-animal-dialog.tsx`

**Checkpoint**: All user stories independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: API contract, docs, and end-to-end validation.

- [x] T047 [P] Update OpenAPI document with animal, media, health, pedigree, verification routes in `apps/api/openapi.yaml`
- [x] T048 [P] Update `doc/Features.md` and `doc/IntegrationGuide.md` for M2 animal supply behavior
- [x] T049 Suspended-owner eligibility integration test in `apps/api/test/animals/suspended-owner.test.ts`
- [x] T050 Audit event coverage test for publish-ready and soft-delete in `apps/api/test/animals/audit.test.ts`
- [x] T051 Run `specs/002-animal-supply/quickstart.md` validation scenarios end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **User Stories (Phases 3–7)**: Depend on Foundational completion
- **Polish (Phase 8)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no story dependencies
- **US2 (P1)**: After Foundational — extends US1 animal entity (can start after T017)
- **US3 (P2)**: After Foundational — needs owned animal from US1
- **US4 (P2)**: After Foundational — reads dimensions initialized in US1/US2
- **US5 (P3)**: After US1/US2 — soft-delete and welfare gate on publish-ready

### Parallel Opportunities

- T002–T004 module scaffolds in parallel
- T006–T008 shared types and migration RLS in parallel
- Per-story test tasks marked [P] can run in parallel before implementation
- US3 health and pedigree repositories (T031, T033) in parallel

---

## Parallel Example: User Story 1

```bash
# Tests in parallel:
T013: RBAC test in apps/api/test/animals/rbac.test.ts
T014: Draft integration test in apps/api/test/animals/draft.test.ts

# Implementation in parallel after tests fail:
T015: AnimalsRepository
T016: DTOs in apps/api/src/modules/animals/dto/
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE** via quickstart US1 scenarios

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → draft CRUD (MVP)
3. US2 → publish-ready + media
4. US3 → health + pedigree evidence
5. US4 → verification badge display
6. US5 → soft-delete + welfare guardrails

### Parallel Team Strategy

- Developer A: US1 + US2 (animals core)
- Developer B: US3 (animal-health + pedigree)
- Developer C: US4 + US5 + web polish

---

## Notes

- Clinical module path is `animal-health` to avoid collision with `modules/health` liveness check
- Never aggregate verification dimensions into a generic "verified" label
- Media and health/pedigree documents served only via signed URLs
- Region eligibility reads canonical config from `@mating/shared`, not hard-coded rules
