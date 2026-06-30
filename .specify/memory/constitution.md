<!--
SYNC IMPACT REPORT
==================
Version change: (template/unversioned) → 1.0.0
Rationale: Initial ratification of the project constitution, derived from
existing engineering and business standards (README.md, doc/Claude.md,
.cursor/Rule.md).

Modified principles: N/A (initial adoption)
Added sections:
  - Core Principles (I–VI)
  - Technology & Platform Standards
  - Development Workflow & Quality Gates
  - Governance
Removed sections: None

Templates requiring updates:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check gate is
    generic and resolves against this file; no edit required)
  - .specify/templates/spec-template.md ✅ aligned (no constitution-specific
    sections required)
  - .specify/templates/tasks-template.md ✅ aligned (task categories are
    compatible with principle-driven gates)
  - .specify/templates/checklist-template.md ✅ aligned (no changes required)

Follow-up TODOs: None
-->

# Mating Marketplace Constitution

Mating is a Pakistan-first animal breeding marketplace. This constitution defines
the non-negotiable principles that govern how the product is designed, built, and
operated. It optimizes for trust, auditability, animal welfare, regulatory
compliance, and a fast, pragmatic MVP launch.

## Core Principles

### I. Trust, Verification & Auditability

Trust MUST be earned before transaction volume is pursued. Every
business-critical action and state transition MUST be auditable.

- Verification is additive and explicit: the system MUST NOT display "verified"
  without naming what was verified (identity, breeder, animal media, health,
  vaccination, pedigree, facility, vet, or inspector).
- The following actions MUST emit immutable audit events: role changes, account
  suspension/reactivation, animal publish/unpublish, verification approve/reject,
  breeding-request status change, payment reconciliation, refund initiation,
  payout approval/release, dispute open/resolve, review moderation, consent
  grant/withdrawal, admin document access, and any RLS bypass / service-role
  operation.
- Audit logs and financial ledger entries MUST be immutable and are exempt from
  user-initiated deletion.

**Rationale**: A breeding marketplace handles money, health claims, and identity;
trust and a tamper-evident record are the product, not features bolted on later.

### II. Animal Welfare, Legality & Regional Compliance

The platform MUST NOT encourage irresponsible breeding and MUST keep
region-specific compliance configurable rather than hard-coded.

- Animal eligibility MUST be enforced before a listing goes live: species, breed
  or breed description, sex, location, owner declaration, at least one image,
  non-blocked health status, and species/region minimum-age checks.
- Region, currency, locale, and eligibility/compliance rules MUST flow from the
  canonical region configuration; new regions are added as configuration, not
  forked logic.
- Prohibited species, illegal wildlife, fighting animals, and cruel practices MUST
  be blocked. Welfare reporting MUST be available.
- The platform MUST NOT launch payment structures described as regulated escrow,
  or USA pet transactions, without documented legal review.

**Rationale**: Welfare failures and legal missteps are existential risks for a
breeding marketplace; compliance must be a first-class, configurable concern.

### III. Security & Privacy by Default

Access control is layered (defense in depth) and sensitive data is private by
default.

- Authentication MUST use JWT; authorization MUST be enforced via RBAC at the API
  layer AND Supabase Row Level Security at the database layer.
- Service-role credentials MUST follow least privilege. Supabase service-role keys
  and provider secrets MUST NEVER be exposed to the browser.
- Rate limiting MUST be applied to auth, search, messaging, and request-creation.
- Health records, payment proofs, identity/inspection evidence, and private
  documents MUST be private by default and served via signed URLs.
- Public listing pages MUST NOT expose phone numbers by default. Analytics MUST
  NOT include private health details, full message text, payment-proof content, or
  government identity documents.

**Rationale**: A single layer of protection is insufficient when handling
payments, identity, and private health data across two regulatory regimes.

### IV. Type-Safe, Versioned API Contracts

Contracts are explicit, typed, versioned, and machine-verified.

- TypeScript MUST be used everywhere; explicit DTOs and schemas MUST be preferred
  over untyped objects.
- All public APIs MUST be served under `/api/v1` and MUST publish an OpenAPI/
  Swagger document; the committed OpenAPI document MUST match the live application
  graph (CI MUST fail on drift).
- Requests MUST use DTO validation; responses MUST use stable error codes and the
  `{ code, message, details? }` error contract.
- List endpoints MUST use cursor pagination. Payment, protected-payment hold/
  release, refund, payout, boost, record-generation, and completion endpoints MUST
  accept idempotency keys.
- Breeding and payment workflows MUST use stable status enums.

**Rationale**: Stable, typed, versioned contracts keep clients, integrations, and
future regions from breaking as the marketplace evolves.

### V. Pragmatic Modular Monolith (YAGNI)

Build a domain-driven modular monolith and resist premature infrastructure.

- The codebase MUST remain a modular monolith with domain modules; concerns MUST
  be separated: domain logic in services, data access in repositories, schema
  changes via migrations — not in controllers or UI components.
- MVP search MUST use PostgreSQL full-text search. Redis, queues, Elasticsearch,
  and microservices MUST be introduced only when a documented scaling need
  requires them.
- A new infrastructure dependency MUST NOT be added without documenting it in
  `doc/Integration.md` and `doc/Setup.md`.
- Complexity beyond these defaults MUST be justified in the plan's Complexity
  Tracking section.

**Rationale**: Early over-engineering delays launch and adds operational burden;
the fastest safe path to MVP is a simple, well-factored monolith.

### VI. Quality Gates & Definition of Done

A change is complete only when it meets the Definition of Done.

- Code MUST compile, and tests for changed behavior MUST pass. Tests MUST cover
  state transitions, permissions/RBAC, and payment flows.
- The API contract MUST be updated. Database migrations MUST be reversible or
  explicitly documented as irreversible.
- RLS and RBAC implications MUST be considered, and required audit events MUST be
  emitted.
- User-facing states MUST handle loading, empty, error, and success (plus
  offline/retry where applicable), using translation keys rather than hardcoded
  copy.
- Documentation MUST be updated when behavior, API/schema/architecture, external
  providers, business rules, or setup change.

**Rationale**: A consistent, enforceable Definition of Done is what keeps a
trust-critical marketplace shippable without regressions.

## Technology & Platform Standards

- **Stack**: Next.js (App Router) + React + TypeScript + Tailwind CSS + React
  Query + Zustand on the web; NestJS (Node.js LTS) for the API; Supabase
  PostgreSQL, Auth, Storage, Realtime, and RLS for the platform. Tooling is pnpm
  workspaces + Turborepo.
- **Pakistan-first UX**: Urdu and English support, phone-first onboarding,
  WhatsApp-style messaging familiarity, and Easypaisa / JazzCash / bank-transfer
  workflows are required. United States is the Phase 2 geography.
- **Frontend conventions**: server components for SEO-heavy pages where practical;
  React Query for server state; Zustand only for client UI/session workflow state;
  mobile-first screens.
- **Database conventions**: UUID primary keys; `created_at`, `updated_at`, and
  `deleted_at` on mutable business tables; soft delete for user-visible business
  records; immutable ledger and audit entries; RLS for user-owned and sensitive
  tables; indexed foreign keys and common filters; explicit region/currency/
  compliance fields.
- **Payment integrity**: client-reported payment status MUST NEVER be trusted;
  webhooks MUST be signature-verified and idempotent; every confirmed payment
  MUST create ledger entries; refunds MUST carry a reason code.
- **Consent & retention**: marketing/promotional notifications require explicit,
  versioned opt-in; campaigns MUST honor unsubscribe and respect PECA (Pakistan)
  and TCPA (USA); retention periods MUST be defined per data class before launch,
  and right-to-erasure MUST be supported within legal limits.

## Development Workflow & Quality Gates

- **CI enforcement**: pull requests and pushes to `main` MUST pass format, lint,
  typecheck, unit tests, web and API builds, SQL migration validation, and
  OpenAPI drift validation before merge.
- **Spec-driven flow**: features follow the Spec Kit workflow (specify → plan →
  tasks → implement). Each plan MUST pass the Constitution Check gate before
  Phase 0 and again after design.
- **Documentation update rule**: implementing a feature MUST update the relevant
  docs — `doc/Features.md` (behavior), `doc/IntegrationGuide.md` (API/schema/
  architecture), `doc/Integration.md` (providers), `.cursor/Rule.md` (rules/
  standards), and `doc/Setup.md` (setup/deploy).
- **Release checkpoint**: any implementation that violates these rules requires a
  documented product and legal decision before release.

## Governance

This constitution supersedes other development practices where they conflict. All
plans, reviews, and pull requests MUST verify compliance with these principles,
and unjustified complexity MUST be rejected.

- **Amendments**: changes MUST be proposed via pull request that updates this
  file, states the rationale, and propagates impacts to dependent templates and
  documentation. Amendments take effect on merge.
- **Versioning policy**: this constitution uses semantic versioning.
  - MAJOR — backward-incompatible governance changes or principle removals/
    redefinitions.
  - MINOR — a new principle/section or materially expanded guidance.
  - PATCH — clarifications, wording, and non-semantic refinements.
- **Compliance review**: principle adherence is reviewed at PR time and at each
  release checkpoint. Deviations MUST be documented (with product and, where
  relevant, legal sign-off) or remediated before release.
- **Runtime guidance**: for day-to-day engineering standards and detailed rules,
  use `doc/Claude.md` and `.cursor/Rule.md`; this constitution governs where they
  conflict.

**Version**: 1.0.0 | **Ratified**: 2026-06-29 | **Last Amended**: 2026-06-29
