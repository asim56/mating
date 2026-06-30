# Implementation Plan: Trust & Admin

**Branch**: `006-trust-admin` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-trust-admin/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [005-payments-trust](../005-payments-trust/spec.md)

## Summary

Deliver **M6 / Checkpoint 5 (partial)**: active verification approve/reject workflows with
vet/inspector dimension scoping, dispute assignment and resolution with optional refund
trigger via payments module, post-completion reviews with moderation and reputation
surfacing, content moderation (listing/animal suspension, message reports), admin audit log
explorer with filtered cursor queries, business analytics dashboards, and Field Onboarding Rep
scoped support actions with attribution audit.

**Trust approach**: Role-scoped actions enforce least privilege (vet → health only, inspector →
evidence/media only, admin → all dimensions). Dispute resolution integrates M5 refunds with
reason codes. Reputation weights verification and completion over raw stars per Features.md.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js`, M1 `audit`/`analytics` modules,
M4 `breeding-requests` + `disputes`, M5 `payments` refund API, M2 verification dimensions on
`animals.metadata`, `@mating/shared` role and verification enums.

**Storage**: Supabase PostgreSQL; extends `disputes`, `reviews`, `verification_requests` from
prior migrations; no new financial tables.

**Testing**: RBAC matrix tests per role; dispute resolution state-transition tests; duplicate
review rejection; suspended listing search exclusion; audit query pagination tests.

**Target Platform**: Linux API host + Next.js admin dashboards.

**Performance Goals**: Listing suspension reflected in search within 1 minute (SC-004); audit
queries <2s p95 under seed load.

**Constraints**: Field rep cannot access payments/payouts/disputes; support cannot approve
payouts; reputation excludes hidden reviews; admin document access audited.

**Scale/Scope**: 4 NestJS module extensions (`verification`, `breeding-requests`, `reviews`,
`admin`); ~18 endpoints; 1 reputation read model; admin web feature area.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Verification approve/reject, dispute resolve, moderation, review hide, admin doc access all emit immutable audit events; explicit per-dimension labels. | PASS |
| II. Animal Welfare & Compliance | Listing suspension for fraud/cruelty/disease; exotic category approval gate per region config. | PASS |
| III. Security & Privacy by Default | Audit explorer filters PII; dashboards exclude health/payment proof; RBAC on all admin routes. | PASS |
| IV. Type-Safe, Versioned API Contracts | `/api/v1`, DTO validation, resolution/reason code enums, cursor pagination on audit/reviews/disputes. | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | Reputation as derived read model; no AI moderation; no native admin app. | PASS |
| VI. Quality Gates & Definition of Done | RBAC tests per dimension; dispute E2E paths; 0% duplicate review success; search suspension test. | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — ready for
`/speckit-tasks`.

## Module deliverables

| Module | Key outputs |
| --- | --- |
| `verification` | Approve/reject with vet/inspector/admin RBAC; updates animal/profile dimension status |
| `breeding-requests` | Dispute assign/resolve; refund trigger; request terminal states |
| `reviews` | Post-completion reviews, edit window, moderation, reputation summary |
| `admin` | Moderation (suspend listing/animal), audit explorer, dashboards, field-rep scoped actions |

## Project Structure

### Documentation (this feature)

```text
specs/006-trust-admin/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── verification-workflows.md
│   ├── disputes.md
│   ├── reviews.md
│   ├── moderation.md
│   └── admin-audit.md
├── checklists/
│   └── requirements.md
└── tasks.md             # NOT created here
```

### Source Code (repository root)

```text
apps/api/src/modules/
├── verification/
│   └── admin-verifications.controller.ts   # EXTEND: approve/reject
├── breeding-requests/
│   └── disputes-admin.controller.ts        # assign, resolve
├── reviews/
│   ├── reviews.controller.ts
│   ├── reviews.service.ts
│   └── reputation.service.ts
└── admin/
    ├── moderation.controller.ts
    ├── audit-explorer.controller.ts
    └── dashboards.controller.ts

apps/web/
├── app/[locale]/(admin)/                     # audit, disputes, verification queues
└── features/admin/

packages/shared/src/
├── enums/dispute-resolution.ts
├── enums/review-status.ts
└── constants/reputation-weights.ts

supabase/migrations/
└── 20250915000000_reviews.sql                # if not merged in M4
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
