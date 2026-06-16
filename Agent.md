# Agent.md

## Purpose

This repository contains the product, market, architecture, and execution blueprint for an animal mating and breeding marketplace launching first in Pakistan and expanding later to the United States.

The engineering agent should use these documents as the source of truth for planning, implementation, and validation.

## Agent Roles

### Product Strategy Agent

- Owns customer segmentation, marketplace liquidity strategy, pricing experiments, and launch sequencing.
- Keeps Pakistan launch needs ahead of USA phase requirements unless explicitly working on Phase 2.
- Validates every feature against one of these outcomes:
  - More verified breeding supply.
  - Higher-quality breeding demand.
  - Safer and more trusted transactions.
  - Better repeat usage through animal records and post-breeding workflows.

### Market Research Agent

- Maintains `MarketPlan.md`.
- Updates competitor tables, TAM/SAM/SOM assumptions, regulatory notes, and pricing benchmarks.
- Flags market claims that need primary validation with breeders, vets, livestock departments, or kennel associations.

### Solution Architecture Agent

- Maintains the modular monolith architecture described in `Context.md`, `IntegrationGuide.md`, and `Setup.md`.
- Prevents premature microservice extraction.
- Designs modules so future service extraction is possible around bounded contexts: identity, animals, matching, breeding, payments, communications, verification, analytics, and admin.

### Backend Engineering Agent

- Builds the NestJS REST API.
- Owns database migrations, Supabase PostgreSQL policies, OpenAPI contracts, RBAC, audit logs, payment state machines, and domain services.
- Must treat breeding, health, pedigree, payment, and verification records as auditable business records.

### Frontend Engineering Agent

- Builds the Next.js App Router frontend with TypeScript, Tailwind CSS, React Query, and Zustand.
- Owns SEO, SSR, internationalization, PWA behavior, mobile-first UX, listing discovery, dashboards, onboarding, and workflow screens.

### QA and Compliance Agent

- Owns test planning, acceptance criteria, abuse scenarios, payment disputes, inspection workflows, and region-specific compliance checks.
- Ensures no feature ships without role and state-transition tests.

### DevOps Agent

- Owns Vercel, Supabase, GitHub Actions, environment variables, observability, backup, and disaster recovery procedures.
- Keeps the deployment path simple for MVP: Vercel + Supabase + managed integrations.

## Development Workflow

1. Read documents in this order:
   1. `Context.md`
   2. `MarketPlan.md`
   3. `Features.md`
   4. `Rule.md`
   5. `IntegrationGuide.md`
   6. `Setup.md`
   7. `Integration.md`
   8. `Pricing.md`
   9. `Skill.md`
2. Confirm the target phase:
   - MVP Pakistan.
   - Pakistan growth.
   - USA expansion.
3. Implement inside the modular monolith unless a document explicitly marks the work as post-MVP service extraction.
4. Add or update database migrations before writing endpoint code that depends on schema changes.
5. Update OpenAPI definitions alongside API changes.
6. Add tests for:
   - RBAC.
   - Animal ownership boundaries.
   - Breeding request state transitions.
   - Payment ledger consistency.
   - Verification and audit events.
7. Run the project checks defined in `Setup.md`.
8. Update documentation when implementation changes the product contract.

## Branch and Commit Guidelines

- Use small feature branches.
- Keep commits scoped by logical change.
- Do not mix market-document updates, schema changes, and UI implementation in one commit unless the change is intentionally full-stack.

## Delivery Checkpoints

### Checkpoint 1: Foundation

- App boots locally.
- Supabase project connected.
- Authentication works with email and phone OTP.
- Basic roles exist.
- Admin can view users and animals.

### Checkpoint 2: Animal Supply

- Breeders and owners can create animal profiles.
- Images, videos, health records, and pedigree fields are stored.
- Verification badges are visible but default to unverified.

### Checkpoint 3: Matching and Requests

- Search and filters work.
- Distance matching works.
- A mating request can move through requested, accepted, scheduled, completed, disputed, and closed states.

### Checkpoint 4: Monetization

- Listing boosts, subscriptions, commissions, escrow records, refunds, and invoices are represented in the data model.
- Pakistan payment methods are integrated or stubbed behind stable provider interfaces.

### Checkpoint 5: Trust and Scale

- Veterinary and inspector workflows exist.
- Audit logs are queryable.
- Analytics events are emitted.
- Region, currency, language, and compliance configuration can support USA expansion.

