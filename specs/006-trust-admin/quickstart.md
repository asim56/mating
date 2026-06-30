# Quickstart & Validation: Trust & Admin

End-to-end validation for M6. Prerequisites: M5 complete ([005 quickstart](../005-payments-trust/quickstart.md))
including verification queue and payment refunds.

## Prerequisites

- M1–M5 green; pending `verification_requests`, open `disputes`, completed breeding requests.
- Roles seeded: `veterinarian`, `inspector`, `support_agent`, `super_admin`.
- Migration `20250915000000_reviews.sql` applied if not in M4.

## Setup

```bash
supabase db reset
pnpm --filter @mating/api dev
pnpm --filter @mating/web dev    # admin dashboards
```

## Scenarios

### US1 — Approve animal verification (P1)

1. From M5: pending health verification exists.
2. Veterinarian `POST /admin/verifications/:id/approve` → `200`, dimension `health` approved.
3. `GET /animals/:id/verification` → `health: approved` (not generic verified).
4. Inspector attempts same on health request → `403`.
5. Admin reject on media request → dimension `rejected` + audit trail.

### US2 — Resolve a dispute (P1)

1. Open dispute from M4 on paid request.
2. Support `POST /admin/disputes/:id/assign` → `assigned`.
3. `POST /admin/disputes/:id/resolve` with `resolutionType: refund_full` → dispute `resolved`,
   request `Refunded`, M5 refund with reason code created.
4. Retry resolve on closed dispute → `400`.

### US3 — Reviews (P2)

1. Completed request; participant `POST /reviews` → `201`.
2. Duplicate review same reviewer → `409` (SC-003).
3. Admin `POST /admin/reviews/:id/moderate` `{ action: "hide" }` → excluded from reputation.
4. `GET /users/:id/reputation` → hidden review not counted.

### US4 — Moderate listings (P2)

1. `POST /admin/listings/:id/suspend` → listing absent from public search within 1 min (SC-004).
2. PK exotic listing without category approval → publish blocked until
   `POST /admin/listings/:id/approve-category`.

### US5 — Audit explorer & dashboards (P2)

1. `GET /admin/audit-logs?action=verification.` → paginated matching entries.
2. `GET /admin/dashboards/summary?period=30d` → metrics populated under seed load.
3. Admin opens verification evidence URL → `admin.document_accessed` audit row.

### RBAC edge cases

- Support agent `POST /admin/payouts/:id/approve` → `403` (M5 rule, still valid).
- Field rep `POST /admin/disputes/:id/resolve` → `403` (FR-010).

## Automated test expectations

- Verification RBAC: 100% dimension-scoped tests pass (SC-001).
- Dispute resolution paths produce correct terminal request states (SC-002).
- Duplicate review success rate 0% (SC-003).
- Suspended listing search exclusion (SC-004).
- Audit query sample: no raw PII beyond policy (SC-005).

## Done checks

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- Admin web routes render audit + dashboard summaries.
- OpenAPI includes M6 admin/trust routes.
