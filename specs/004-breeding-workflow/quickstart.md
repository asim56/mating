# Quickstart & Validation: Breeding Workflow

End-to-end validation for M4. See `data-model.md`, `contracts/`, and `tasks.md`.

## Prerequisites

- M1 (auth, audit, analytics, outbox), M2 (publish-ready animals), M3 (active listings).
- Migration `20250803000000_breeding_workflow.sql` applied.
- Two owner accounts with compatible animals; one active listing.

## Setup

```bash
pnpm install
supabase db reset
pnpm --filter @mating/api dev
pnpm --filter @mating/web dev
```

## Validation scenarios

### US1 — Submit and respond (P1)

1. Requester: `POST /breeding-requests` against active listing → `201` `status: Requested`;
   recipient receives outbox notification.
2. Recipient: `POST /breeding-requests/:id/accept` → `Accepted`; event log + audit row.
3. Same-animal or wrong-sex natural attempt → `400` with clear reason.
4. Non-recipient accept → `403`.

### US2 — Schedule and complete (P1)

1. `POST .../schedule` → `Scheduled`.
2. `POST .../start` → `InProgress`; `POST .../complete` → `Completed`.
3. `POST .../record` with `Idempotency-Key` → `201` breeding record; request
   `RecordGenerated`.
4. Repeat `POST .../record` same key → `200` identical record (SC-005).
5. `POST .../close` → `Closed`; exactly one `breeding_records` row for request.

### US3 — Masked messaging (P1)

1. Create conversation for `Requested` request; send body `Call me +923001234567`.
2. `GET .../messages` → body contains `[phone hidden]`; `phoneRevealed: false`.
3. Accept + schedule request; send new message with phone → `phoneRevealed: true` (default
   policy).
4. Non-participant `GET /conversations/:id/messages` → `403`.

### US4 — Open dispute (P2)

1. From `Scheduled` or `InProgress`: `POST .../dispute` with valid `reasonCode` → `201`,
   request `Disputed`, dispute `open`.
2. From `Rejected`: dispute → `409 INVALID_STATE_TRANSITION`.
3. `dispute_opened` in analytics; audit row present.

### US5 — Workflow notifications (P2)

1. Accept transition → `outbox_messages` row in same transaction (verify in test DB).
2. User with marketing notifications disabled still receives transactional breeding
   notification (category check).

## Automated test expectations (DoD)

- State machine: 100% illegal transitions rejected (SC-002).
- Every transition: one `breeding_request_events` row + one audit entry (SC-004).
- Phone masking: 100% pre-acceptance mask rate (SC-003).
- Record idempotency: duplicate completion/record calls → zero extra rows (SC-005).
- RLS: participant isolation on requests and messages.

## End-to-end path (SC-001)

Traverse `Requested` → `Accepted` → `Scheduled` → `InProgress` → `Completed` →
`RecordGenerated` → `Closed` in staging integration test with notifications stubbed.

## Done checks

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- `BREEDING_REQUEST_STATUS` exported from `@mating/shared` and used in API DTOs.
- OpenAPI includes breeding, messaging, dispute-open routes.
- `supabase db reset` applies workflow migration cleanly.
