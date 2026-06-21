# Skill.md

## Required Technical Capabilities

## Product and Domain Skills

### Marketplace Strategy

- Two-sided marketplace liquidity.
- Supply acquisition.
- Trust and safety mechanics.
- Pricing experiments.
- Conversion funnel analysis.
- Category expansion strategy.

### Animal Breeding Domain

- Livestock breeding basics.
- Companion animal breeder workflows.
- Health and vaccination record interpretation.
- Pedigree and registry concepts.
- Artificial insemination and semen distribution constraints.
- Animal welfare risk recognition.

### Regional Compliance

Pakistan:

- Provincial livestock breeding authority requirements.
- AI technician and semen provider registration concepts.
- Kennel Club of Pakistan pedigree workflows.
- Animal welfare baseline obligations.

USA:

- USDA APHIS Animal Welfare Act concepts.
- State commercial breeder laws.
- Pet purchaser protection laws.
- Health certificate, contract, and refund obligations.

## Engineering Skills

### Frontend

- Next.js App Router.
- React Server Components.
- TypeScript.
- Tailwind CSS.
- React Query.
- Zustand.
- SEO and structured metadata.
- PWA patterns.
- Internationalization.
- Mobile-first design.

### Backend

- Node.js LTS.
- NestJS.
- REST API design.
- OpenAPI/Swagger.
- DTO validation.
- RBAC.
- Rate limiting.
- Domain-driven modular monoliths.
- Repository and service patterns.

### Database

- PostgreSQL.
- Supabase.
- Row Level Security.
- SQL migrations.
- Full-text search.
- JSONB modeling.
- Ledger tables.
- Audit logging.
- Backup and restore.

### Integrations

- Supabase Auth.
- Supabase Storage.
- Supabase Realtime.
- Resend.
- Twilio or local SMS provider.
- Firebase Cloud Messaging.
- Easypaisa/JazzCash merchant APIs.
- Stripe and Stripe Connect.
- Sentry.
- PostHog.
- Vercel Analytics.

### Security

- JWT validation.
- RLS policy design.
- Secure file upload.
- Signed URLs.
- Webhook signature validation.
- Payment idempotency.
- Secret management.
- Privacy-safe analytics.
- Abuse moderation.

### DevOps

- Vercel deployments.
- Supabase environments.
- GitHub Actions.
- Environment variables.
- Preview deployments.
- Monitoring and alerting.
- Backup verification.
- Incident response.

## Role Capability Matrix

| Capability | Product | Frontend | Backend | DevOps | QA | Compliance |
| --- | --- | --- | --- | --- | --- | --- |
| MVP scope | Lead | Support | Support | Support | Support | Support |
| User workflows | Lead | Lead | Support | No | Support | Support |
| API contracts | Support | Support | Lead | No | Support | No |
| Database schema | Support | No | Lead | Support | Support | No |
| RLS/RBAC | Support | No | Lead | Support | Test | Review |
| Payments | Support | Support | Lead | Support | Test | Review |
| Compliance rules | Support | No | Implement | No | Test | Lead |
| Observability | No | Support | Support | Lead | Support | No |
| Launch operations | Lead | Support | Support | Support | Lead | Support |

## Agent Specialization

### Good First Implementation Tasks

- Repository scaffolding.
- Static landing pages.
- Auth/profile flow.
- Breed seed data.
- Animal CRUD.
- Listing search.

### Higher-Risk Tasks

- Payment reconciliation.
- Refunds.
- RLS policy design.
- Admin service-role access.
- Verification approvals.
- USA compliance rules.
- Health and pedigree document privacy.

### Specialist Review Required

- Escrow claims.
- USA pet purchaser protections.
- AI/semen provider onboarding.
- Terms of service.
- Animal welfare policy.
- Payment provider contracts.

## Knowledge Gaps to Validate

- Actual merchant onboarding requirements for Easypaisa and JazzCash.
- Whether Pakistan payment providers support split payments or escrow-like holds.
- Current provincial registration processes for AI technicians and semen providers.
- Vet availability and willingness to verify through the platform.
- Breeder willingness to pay for verification versus boosts.
- USA state prioritization for launch.

## Checkpoint

Before assigning high-risk implementation tasks, verify the responsible agent has the skills listed in this document or route the work through specialist review.

