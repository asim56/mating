# Implementation Plan: Breeding Workflow

**Branch**: `004-breeding-workflow` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-breeding-workflow/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**:
[002-animal-supply](../002-animal-supply/spec.md), [003-discovery](../003-discovery/spec.md)

## Summary

Deliver **M4 / Checkpoint 4**: canonical breeding-request status enum and guarded state
machine in `@mating/shared`, request creation with eligibility validation, append-only
`breeding_request_events`, idempotent `breeding_records` generation, dispute opening
(resolution deferred to M6), request/listing-linked conversations with phone masking until
`Accepted`/`Scheduled`, message reporting, and workflow notifications via M1 transactional
outbox (localized en/ur).

Three NestJS modules: `breeding-requests`, `messaging`, plus notification wiring in
existing `notifications`. Payment collection mechanics (M5) may transition to
`PaymentPending` but do not collect funds in this feature.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js`, M1 `audit`, `analytics`,
`notifications` (outbox), M2 `animals`, M3 `marketplace`/`matching`, `class-validator`,
`@mating/shared` (`BREEDING_REQUEST_STATUS`, `BREEDING_REQUEST_TRANSITIONS`,
`BREEDING_METHODS`, `DISPUTE_REASON_CODES`, `PHONE_MASK_POLICY`).

**Storage**: Supabase PostgreSQL — `breeding_requests`, `breeding_request_events`,
`breeding_records`, `disputes`, `conversations`, `conversation_participants`, `messages`.
Migrations in `supabase/migrations/`.

**Testing**: `node --test`; exhaustive state-machine transition tests (allowed + denied);
phone masking tests; idempotent record generation; outbox-in-same-transaction tests; RLS
participant isolation.

**Target Platform**: Linux API host + Vercel web.

**Performance Goals**: Request create + notify <3s p95; message send <1s p95 on seed data.

**Constraints**: Illegal transitions rejected with stable error codes; record generation
idempotency key on `POST .../record`; messaging rate limit; phone masked pre-acceptance;
disputes open-only; transactional notifications for breeding categories even when marketing
opted out.

**Scale/Scope**: 3 modules; ~18 endpoints; 6 tables + RLS; shared state machine package.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Every status change → `breeding_request_events` + audit; dispute open audited; immutable event log | PASS |
| II. Animal Welfare, Legality & Regional Compliance | Eligibility checks min-age, health, opposite-sex for natural mating, region rules from config | PASS |
| III. Security & Privacy by Default | Phone masking until Accepted/Scheduled; participant-only RLS; signed attachment URLs; messaging rate limits | PASS |
| IV. Type-Safe, Versioned API Contracts | `/api/v1`, shared status enum, DTO validation, idempotency on record generation, cursor pagination | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | State machine in shared + service guards; outbox reuse from M1; no separate message queue | PASS |
| VI. Quality Gates & Definition of Done | Full transition matrix tests, masking tests, idempotent record tests, outbox transaction tests | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — data-model and
contracts complete; ready for `/speckit-tasks`.

## M4 Module deliverables

| Module | Key outputs |
| --- | --- |
| `breeding-requests` | CRUD, transitions, events, record generation, dispute open |
| `messaging` | Conversations, messages, masking, report, freeze |
| `notifications` | Workflow outbox producers on transitions (extend M1) |
| `web` | Request dashboard, conversation UI, transition actions |

## Project Structure

### Documentation (this feature)

```text
specs/004-breeding-workflow/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── breeding-requests.md
│   ├── messaging.md
│   └── disputes.md
├── checklists/
│   └── requirements.md
└── tasks.md             # NOT created here
```

### Source Code (repository root)

```text
apps/api/src/modules/
├── breeding-requests/               # NEW
│   ├── breeding-requests.controller.ts
│   ├── breeding-requests.service.ts
│   ├── breeding-requests.repository.ts
│   ├── state-machine/
│   │   └── breeding-request.state-machine.ts
│   ├── dto/
│   ├── policies/breeding-request.policy.ts
│   └── breeding-requests.module.ts
├── messaging/                       # NEW
│   ├── messaging.controller.ts
│   ├── messaging.service.ts
│   ├── phone-mask.service.ts
│   └── messaging.module.ts
└── notifications/                   # MODIFY: workflow templates + producers

apps/web/
├── app/[locale]/(dashboard)/requests/
├── app/[locale]/(dashboard)/messages/
└── features/breeding-workflow/

packages/shared/src/
├── enums/breeding-request-status.ts   # canonical enum + transitions
├── constants/breeding.ts
└── types/breeding-request.ts

supabase/migrations/
└── 20250803000000_breeding_workflow.sql
```

**Structure Decision**: `breeding-requests` owns workflow and records; `messaging` is a
separate bounded context per IntegrationGuide. State machine logic lives in
`packages/shared` (enum + transition map) and is enforced in the service layer with tests.

## Complexity Tracking

> No constitution violations — this section is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    | —          | —                                    |
