# Implementation Plan: Payments & Trust

**Branch**: `005-payments-trust` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-payments-trust/spec.md`

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [004-breeding-workflow](../004-breeding-workflow/spec.md)

## Summary

Deliver **M5 / Checkpoint 4**: payment intents with idempotency keys, bank-transfer proof
upload, provider webhook handling (signature-verified, deduplicated via `webhook_events`),
immutable double-entry `ledger_entries`, protected-payment integration with breeding-request
`PaymentPending` → `Scheduled` transitions, payout accounts/requests with admin
approve/release, admin reconciliation/refunds with reason codes, boost orders and
subscription stubs (Easypaisa/JazzCash/Stripe behind `PaymentProvider`), and verification
request submission plus admin pending queue (approval workflows deferred to M6).

**Payment approach**: All provider integrations implement `PaymentProvider` from
`@mating/shared`; launch ships **bank transfer + stubs** (no live merchant onboarding).
Client-reported payment success is never trusted — only admin reconciliation or verified
webhooks confirm intents.

## Technical Context

**Language/Version**: TypeScript 5.8 on Node.js >=22 (NestJS 11 API, Next.js 15 web).

**Primary Dependencies**: NestJS 11, `@supabase/supabase-js` (service role), existing
`infra/supabase`, `class-validator` DTOs, `@mating/shared` (`PaymentProvider`,
`StorageProvider`, breeding-request status enum from M4), React Query + App Router for
payment/checkout flows.

**Storage**: Supabase PostgreSQL; `payment-proofs` private bucket via `StorageProvider`;
migrations in `supabase/migrations/` (`20250901000000_*` series per ExecutionBacklog).

**Testing**: `node --test` via `tsx`; ledger append-only DB tests; webhook replay
idempotency tests; breeding-request state-transition tests with payment hooks.

**Target Platform**: Linux API host (webhooks + outbox drainer require long-running host).

**Performance Goals**: Intent creation <500ms p95; webhook processing <2s p95; duplicate
webhook replays produce zero duplicate ledger rows (SC-002).

**Constraints**: Ledger + `webhook_events` insert-only (DB grants revoke UPDATE/DELETE);
unique `(provider, idempotency_key)` on intents and payouts; refunds require reason codes;
proof access audited; PK providers Easypaisa/JazzCash/bank, US Stripe stub.

**Scale/Scope**: 3 NestJS modules (`payments`, `wallet-ledger`, `verification` queue
surface); ~20 endpoints; 9 tables + storage policies; 4 provider adapter stubs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|-----------|------------|--------|
| I. Trust, Verification & Auditability | Reconciliation, refund, payout, proof access, and payment state changes emit immutable audit events; ledger append-only; verification queue listed for M6 approval. | PASS |
| II. Animal Welfare & Regional Compliance | No regulated escrow marketing; ledger-state protected payments until legal clearance; region config drives currency and provider metadata. | PASS |
| III. Security & Privacy by Default | Payment proofs private (signed URLs); webhook signature validation; RBAC on admin reconcile/refund/payout; service-role isolated. | PASS |
| IV. Type-Safe, Versioned API Contracts | `/api/v1`, DTO validation, idempotency keys on intents/payouts/boosts, OpenAPI drift-gated, stable error bodies. | PASS |
| V. Pragmatic Modular Monolith (YAGNI) | `PaymentProvider` interface; stub adapters; no live merchant SDKs at launch; bank transfer as PK MVP path. | PASS |
| VI. Quality Gates & Definition of Done | Ledger immutability tests; webhook dedup tests; refund-without-reason rejection; breeding payment state tests; specialist review for wallet-ledger. | PASS |

**Initial gate**: PASS — no violations. **Post-design re-check**: PASS — data-model and
contracts complete; ready for `/speckit-tasks`.

## Module deliverables

| Module | Key outputs |
| --- | --- |
| `payments` | Intents, webhooks, proof upload, provider stubs (Easypaisa/JazzCash/Stripe/bank), subscriptions, boosts |
| `wallet-ledger` | Immutable `ledger_entries`, payout accounts/payouts, admin reconcile/refund |
| `verification` (queue) | `verification_requests` submit + `GET /admin/verifications` pending queue |

## Project Structure

### Documentation (this feature)

```text
specs/005-payments-trust/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── payments.md
│   ├── webhooks.md
│   ├── ledger-payouts.md
│   ├── admin-payments.md
│   ├── monetization.md
│   └── verifications.md
├── checklists/
│   └── requirements.md
└── tasks.md             # /speckit-tasks output (NOT created here)
```

### Source Code (repository root)

```text
apps/api/src/modules/
├── payments/
│   ├── payments.controller.ts
│   ├── payments.service.ts
│   ├── webhook.controller.ts
│   ├── proof.controller.ts
│   ├── subscriptions.controller.ts
│   ├── boosts.controller.ts
│   ├── providers/
│   │   ├── payment-provider.factory.ts
│   │   ├── easypaisa.stub.ts
│   │   ├── jazzcash.stub.ts
│   │   ├── stripe.stub.ts
│   │   └── bank-transfer.adapter.ts
│   └── events/
├── wallet-ledger/
│   ├── wallet-ledger.service.ts
│   ├── ledger-writer.service.ts
│   ├── payouts.controller.ts
│   └── admin-payments.controller.ts
└── verification/
    ├── verifications.controller.ts
    └── admin-verifications.controller.ts   # queue only; approve in M6

packages/shared/src/
├── integrations/index.ts          # PaymentProvider (exists)
├── enums/payment-status.ts
├── enums/payment-purpose.ts
└── enums/payment-provider.ts

supabase/migrations/
├── 20250901000000_payment_intents_webhook_events.sql
├── 20250901000100_subscription_plans_subscriptions.sql
├── 20250901000200_boost_orders.sql
├── 20250901000300_ledger_entries.sql
└── 20250901000400_payout_accounts_payouts.sql
```

**Structure Decision**: Payments and wallet-ledger are separate modules per IntegrationGuide
bounded contexts; verification queue surface extends M2 `verification` module without M6
approval endpoints.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | — | — |
