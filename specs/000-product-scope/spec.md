# Feature Specification: End-to-End Product Scope (Pakistan + USA MVP)

**Feature Branch**: `000-product-scope`

**Created**: 2026-06-30

**Status**: Approved (scope locked via stakeholder clarification)

**Input**: Full Pakistan MVP (M0–M7) with dual geography (PK + US product surfaces),
bank-transfer + PaymentProvider stubs for payments, M0 foundation folded into M1, and
Spec Kit flow: all module specs/plans before implementation.

## Purpose

This document is the **master product scope** for the Mating marketplace end-to-end
build. It does not replace per-module feature specs; it defines milestones, modules,
dependencies, launch geography, payment depth, and the Spec Kit artifact sequence so
every downstream spec stays aligned.

## Product Outcomes (non-negotiable)

Every module MUST serve at least one of these outcomes (from `doc/Agent.md`):

1. More verified breeding **supply**.
2. Higher-quality breeding **demand**.
3. Safer, more **trusted** transactions.
4. Better **repeat usage** through animal records and post-breeding workflows.

## Launch Geography (locked)

**Dual geography from the start** — both Pakistan and United States product surfaces
ship in this MVP phase:

| Region | Currency | Locale | Auth / UX | Payments (M5 bar) |
| --- | --- | --- | --- | --- |
| Pakistan (PK) | PKR | English + Urdu (RTL) | Phone-first (+92 OTP) | Bank-transfer proof + Easypaisa/JazzCash **stubs** |
| United States (US) | USD | English | Email-first; phone optional | Stripe **stub** + bank-transfer proof pattern |

**Implications**:

- Region configuration (`config/regions`) MUST seed PK and US at M1 with eligibility,
  currency, locale, and payment-provider metadata.
- Web MUST support locale/region selection and RTL for Urdu from M1 onward.
- Payment integrations use the `PaymentProvider` interface; live merchant onboarding is
  **out of scope** — stubs and bank-transfer proof are the launch bar.
- US pet-transaction and regulated-escrow rules remain subject to legal review per
  constitution Principle II; ledger-state model until cleared.

## Milestone Map

| Milestone | Window (indicative) | Exit criteria (summary) | Spec Kit artifact |
| --- | --- | --- | --- |
| **M0** (folded into M1) | — | Rate limits, RLS/RBAC harness, CI gates, RTL shell | Absorbed into `001-identity-auth` |
| **M1** Identity & Profiles | Days 8–22 | Auth, roles, profiles, regions/breeds seed, audit/analytics/notifications/outbox | `001-identity-auth` ✅ amended |
| **M2** Animal Supply | Days 18–38 | Animals, media, health/pedigree records, breeder profiles, listing drafts, passive verification badges | `002-animal-supply` |
| **M3** Discovery | Days 34–54 | Publish listings, search/filters, SEO pages, saved listings, discovery analytics | `003-discovery` |
| **M4** Breeding Workflow | Days 50–70 | Request lifecycle, events, records, messaging w/ phone masking, workflow notifications | `004-breeding-workflow` |
| **M5** Payments & Trust | Days 66–84 | Payment intents, bank-transfer proof, provider stubs, ledger, protected-payment states, boosts/subscriptions (stub) | `005-payments-trust` |
| **M6** Trust & Admin | Days 78–92 | Vet/inspector verification, disputes, reviews, moderation, audit explorer, admin dashboards | `006-trust-admin` |
| **M7** Launch Hardening | Days 86–100 | Security/perf review, observability, DR tests, retention policy, beta instrumentation | `007-launch-hardening` |

## Module Catalog

Twenty backend bounded contexts. Naming: `system` = liveness; `health` = animal clinical
records (not API health check).

| # | Module | Milestone | Owned data (summary) | Depends on |
| --- | --- | --- | --- | --- |
| 1 | `system` | M0→M1 | none (health endpoint) | — |
| 2 | `config/regions` | M1 | `regions` | — |
| 3 | `identity` | M1 | Supabase `auth.users`, `sessions` | `config/regions` |
| 4 | `users` | M1 | `profiles`, `user_roles`, `consents`, `notification_preferences` | `identity`, `config/regions` |
| 5 | `audit` | M1 | `audit_logs` | M0 harness |
| 6 | `analytics` | M1 | `analytics_events` | M0 harness |
| 7 | `notifications` | M1 | `devices`, `notification_logs`, `outbox_messages` | M0 harness |
| 8 | `breeds` | M1 | `breeds` | — |
| 9 | `animals` | M2 | `animals`, `animal_media` | `users`, `breeds` |
| 10 | `health` | M2 | `health_records` | `animals` |
| 11 | `pedigree` | M2 | `pedigree_records` | `animals` |
| 12 | `verification` | M2 badges / M6 workflow | `verification_requests` | `animals`, `health`, `pedigree` |
| 13 | `marketplace` | M3 | `listings`, `boost_orders`, `saved_listings` | `animals`, `users` |
| 14 | `matching` | M3 | reads listings/animals | `marketplace`, `animals` |
| 15 | `breeding-requests` | M4 | `breeding_requests`, `breeding_request_events`, `breeding_records`, `disputes` | `marketplace`, `animals` |
| 16 | `messaging` | M4 | `conversations`, `messages` | `breeding-requests`, `marketplace` |
| 17 | `payments` | M5 | `payment_intents`, `webhook_events`, `subscriptions` | `breeding-requests` |
| 18 | `wallet-ledger` | M5 | `ledger_entries`, `payouts`, `payout_accounts` | `payments` |
| 19 | `reviews` | M6 | `reviews` | `breeding-requests` |
| 20 | `admin` | M6 | cross-module | all prior |

Cross-cutting: `audit`, `analytics`, `notifications`, and transactional outbox are built
in M1 and wired into each producing module as it lands.

## Repository State (2026-06-30)

**Built today**:

- Monorepo scaffold (`apps/web`, `apps/api`, `packages/*`), Docker, CI.
- `system` health endpoint (`GET /api/v1/health`).
- Partial NestJS scaffolds: `regions`, `breeds` modules (in-memory; no DB migrations yet).
- Foundation SQL migration only (extensions + `set_updated_at()`).

**Not built**: business tables, RLS, auth, domain workflows, web product surfaces.

## MVP Feature Cut (from `doc/Features.md`)

### Include

Auth, roles, animal profiles, media/documents, search/filters, saved listings, breeding
request lifecycle, basic messaging, notification preferences/consent, reviews, manual +
provider-ready payments (stubs per scope lock), verification queue, admin dashboard,
analytics events.

### Defer

Native mobile apps, Elasticsearch, Redis, full AI recommendations, automated transport,
complex offspring marketplace, multi-country tax automation, native video calling, **live**
Easypaisa/JazzCash/Stripe merchant integrations.

## Spec Kit Execution Order (locked)

1. **Spec phase** — complete `spec.md` (+ checklist) for `001` through `007`.
2. **Plan phase** — `/speckit-plan` per feature → `plan.md`, `research.md`, `data-model.md`, contracts.
3. **Tasks phase** — `/speckit-tasks` per feature → `tasks.md`.
4. **Implement phase** — `/speckit-implement` milestone by milestone (M1 → M7).

`001-identity-auth` already has spec + plan; it MUST be amended for dual geography and
inline M0 foundation tasks before tasks generation.

## User Scenarios & Testing

### User Story 1 - Pakistan breeder lists an animal (Priority: P1)

A breeder in Punjab registers with phone OTP, completes a profile, registers a buffalo,
uploads photos and health documents, and publishes a breeding listing visible to owners in
Pakistan.

**Independent Test**: End-to-end path from PK phone sign-up to published listing with
Urdu/English UI and PKR pricing.

### User Story 2 - US owner requests breeding (Priority: P1)

An animal owner in Texas registers with email, searches compatible listings, submits a
breeding request, exchanges masked messages, and completes the workflow through record
generation.

**Independent Test**: US region config, USD display, email auth path, and full breeding
status lifecycle without live card processing.

### User Story 3 - Trust and payments (Priority: P2)

After a request is accepted, the owner submits bank-transfer proof; admin reconciles;
ledger entries are immutable; dispute can be opened and resolved.

**Independent Test**: Bank-transfer proof flow + stub provider callbacks + ledger audit
trail.

### User Story 4 - Verification and admin (Priority: P2)

A vet verifies health readiness; an inspector approves animal evidence; support moderates
content; admin explores audit logs.

**Independent Test**: Verification queue + role-scoped actions + audit explorer.

## Requirements

### Functional Requirements

- **FR-001**: System MUST deliver all milestones M1–M7 as modular NestJS domains with
  Supabase PostgreSQL, RLS, and OpenAPI `/api/v1` contracts.
- **FR-002**: System MUST support PK and US regions with distinct currency, locale, and
  payment-metadata configuration from M1.
- **FR-003**: System MUST enforce constitution principles (audit events, verification
  labels, layered security, idempotency on financial endpoints).
- **FR-004**: Payment launch MUST use bank-transfer proof and provider stubs only; no
  live merchant dependency for go-live.
- **FR-005**: M0 foundation gaps (rate limits, RLS/RBAC test harness, migration/OpenAPI
  CI gates, RTL design shell) MUST be closed as part of M1 delivery.
- **FR-006**: Each milestone MUST have a Spec Kit feature directory with spec, plan,
  research, data-model, contracts, tasks, and checklist before implementation begins.
- **FR-007**: Breeding-request status MUST use the canonical enum from `doc/Features.md`
  (`Draft` through `Refunded`) published in shared types.

### Key Entities (cross-milestone)

- **Region**: Launch geography, currency, locale, eligibility/compliance jsonb config.
- **User/Profile**: Identity, roles, consents, notification preferences.
- **Animal**: Species, breed, media, owner, verification dimensions.
- **Listing**: Published breeding offer, fees, availability, boost state.
- **BreedingRequest**: Lifecycle state machine, schedule, participants.
- **PaymentIntent / LedgerEntry**: Financial state; immutable ledger.
- **VerificationRequest**: KYC/KYB/animal/facility evidence workflow.
- **AuditLog / AnalyticsEvent**: Cross-cutting observability and trust.

## Success Criteria

- **SC-001**: A PK breeder and a US owner can each complete their primary journey (sign-up
  → listing or request → messaging → completion/record) in a staging environment.
- **SC-002**: 100% of constitution-mandated audit actions emit immutable events (verified
  by automated tests per milestone).
- **SC-003**: OpenAPI document matches live API graph in CI for every merged milestone.
- **SC-004**: Both Urdu (RTL) and English locales render core M1–M4 flows without layout
  breakage.
- **SC-005**: Payment flows complete with bank-transfer proof and stub providers with
  idempotent webhook handling and ledger entries.

## Assumptions

- Team executes **spec-all-then-implement**: all seven feature specs/plans complete
  before M1 coding starts (except amending existing `001`).
- API deploys to a **long-running host**; web to Vercel (per `doc/ImplementationPlan.md`).
- Supabase Auth handles phone OTP and email/password; SMS via configured provider.
- Dual geography means **product surfaces** for both regions, not necessarily equal GTM
  marketing launch timing.
- Field Onboarding Rep ships as scoped Support variant in M6.

## Open Decisions (none blocking spec phase)

- Exact data-retention periods per data class (required before M7 production; placeholder
  values acceptable in M6 spec).
- Conservative PK eligibility defaults vs domain-expert review (seed in M1, refine in M4).

## References

- `doc/ImplementationPlan.md` — module catalog, tasks, estimates
- `doc/Features.md` — product contract, RBAC, MVP cut
- `.specify/memory/constitution.md` v1.0.0 — governing principles
- `specs/000-product-scope/module-roadmap.md` — spec numbering and status tracker
