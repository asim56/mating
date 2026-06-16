# Claude.md

## Coding Agent Instructions

You are building a real marketplace business, not a demo classifieds app. Optimize for trust, auditability, marketplace liquidity, and fast MVP launch.

## Primary Product Direction

- Launch geography: Pakistan.
- Phase 2 geography: United States.
- MVP architecture: modular monolith.
- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, React Query, Zustand.
- Backend: Node.js LTS with NestJS preferred.
- Database and backend platform: Supabase PostgreSQL, Supabase Auth, Supabase Storage, Supabase Realtime, and Row Level Security.
- Deployment: Vercel for frontend and API where feasible during MVP.

## Non-Negotiable Build Principles

1. Pakistan-first UX:
   - Urdu and English support.
   - Phone-first onboarding.
   - WhatsApp-style familiarity for messaging and notifications.
   - Easypaisa, JazzCash, and bank-transfer workflows.
2. Trust before transaction volume:
   - Verification badges.
   - Health records.
   - Pedigree evidence.
   - Breeder ratings.
   - Dispute workflow.
   - Audit logs.
3. Animal welfare and legality:
   - Do not encourage irresponsible breeding.
   - Require age, health, vaccination, and owner declarations before breeding requests.
   - Keep region-specific compliance configurable.
4. Do not overbuild:
   - Use PostgreSQL full-text search for MVP.
   - Use Redis, queues, Elasticsearch, and microservices only when the scaling phase requires them.

## Required Engineering Shape

Use a domain-driven modular monolith:

```text
apps/
  web/
  api/
packages/
  config/
  database/
  shared/
  ui/
```

Backend modules:

```text
identity
users
animals
breeds
health
pedigree
matching
breeding-requests
marketplace
payments
wallet-ledger
verification
messaging
notifications
reviews
analytics
admin
audit
```

## API Rules

- Prefix APIs with `/api/v1`.
- Publish OpenAPI/Swagger.
- Use DTO validation.
- Use cursor pagination for marketplace feeds and search results.
- Use idempotency keys for payment, escrow, refund, and completion endpoints.
- Use stable status enums for breeding and payment workflows.
- Do not expose internal Supabase keys to the client.

## Security Rules

- JWT authentication.
- RBAC at API layer.
- Supabase RLS at database layer.
- Rate limiting for auth, search, messaging, and request creation.
- Audit logs for privileged actions and business-critical state transitions.
- Signed URLs for private documents and health records.
- Least-privilege service-role usage.

## Documentation Update Rule

When implementing a feature, update:

- `Features.md` if user behavior changes.
- `IntegrationGuide.md` if API, schema, or architecture changes.
- `Integration.md` if external providers change.
- `Rule.md` if a business rule, compliance rule, or development standard changes.
- `Setup.md` if local, deployment, or environment setup changes.

## Definition of Done

A change is done only when:

- Code compiles.
- Tests for changed behavior pass.
- API contract is updated.
- Database migration is reversible or explicitly documented as irreversible.
- RLS and RBAC are considered.
- Audit events are emitted where required.
- User-facing states have loading, empty, error, and success treatment.

