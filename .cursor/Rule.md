# Rule.md

## Development Standards

### Code Quality

- Use TypeScript everywhere.
- Prefer explicit DTOs and schemas over untyped objects.
- Keep domain logic in services, not controllers or UI components.
- Keep database access in repositories.
- Use migrations for schema changes.
- Add tests for state transitions, permissions, and payment flows.
- Do not introduce a new infrastructure dependency without documenting it in `Integration.md` and `Setup.md`.

### API Standards

- All public APIs use `/api/v1`.
- Use REST for MVP.
- Generate OpenAPI/Swagger.
- Use cursor pagination for lists.
- Use idempotency keys for payments, refunds, boosts, and record generation.
- Return stable error codes.
- Do not expose provider secrets or Supabase service role keys to the browser.

### Frontend Standards

- Use Next.js App Router.
- Use server components for SEO-heavy pages where practical.
- Use React Query for server state.
- Use Zustand only for client UI/session workflow state.
- Use Tailwind CSS for styling.
- Build mobile-first screens.
- Support loading, empty, error, success, and offline/retry states.
- Use translation keys, not hardcoded UI copy.

### Database Standards

- UUID primary keys.
- `created_at`, `updated_at`, and `deleted_at` for mutable business tables.
- Soft delete user-visible business records.
- Immutable ledger entries.
- Immutable audit logs.
- RLS enabled for user-owned and sensitive tables.
- Index foreign keys and common filters.
- Keep region/currency/compliance fields explicit.

## Business Rules

### Animal Eligibility

Before an animal can be listed for breeding:

- Species is required.
- Breed or breed description is required.
- Sex is required.
- Location is required.
- Owner declaration is required.
- Minimum age rules must be checked by species and region.
- Health status must not be blocked.
- At least one image is required.

### Verification

Verification is additive, not binary.

Supported verification dimensions:

- Owner identity.
- Breeder profile.
- Animal media.
- Health record.
- Vaccination record.
- Pedigree document.
- Facility inspection.
- Vet review.
- Inspector review.

Do not show "verified" without specifying what is verified.

### Breeding Request Rules

- A user cannot request mating with their own animal unless explicitly allowed for record-only workflows.
- Requester and recipient must both have active accounts.
- Animals must be active and not soft-deleted.
- Animals must be opposite sex for natural mating unless the workflow is AI/semen or record-only.
- A request must have one of the supported methods:
  - `natural`
  - `artificial_insemination`
  - `semen_purchase`
  - `record_only`
- Status changes must be recorded in `breeding_request_events`.
- Completion must generate or update a breeding record.

### Payment Rules

- Never trust client-reported payment status.
- Payment webhooks must be signature-verified.
- Payment events must be idempotent.
- Every confirmed payment creates ledger entries.
- Refunds require a reason code.
- Admin manual reconciliation requires audit logging.
- The platform must not describe a payment as regulated escrow unless legal review approves the provider and structure.

### Messaging Rules

- Conversations should be tied to a listing or breeding request.
- Users can only read conversations where they are participants or have admin/support permission.
- Attachments use signed URLs.
- Reported messages are visible to support.
- Phone numbers can be hidden until policy allows disclosure.

### Reviews and Reputation

- Reviews are allowed only after meaningful interaction, ideally completed request or support-approved exception.
- Disputed transactions should not immediately publish negative reputation until support review.
- Verification badges and completion count should weigh more than raw star ratings.

## Compliance Rules

### Pakistan

- AI technicians, semen distributors, and semen production providers must be regionally verified before listing AI/semen services.
- Punjab and Sindh livestock breeding requirements must be represented in provider onboarding.
- Kennel Club of Pakistan rules should be captured for pedigreed dog workflows where users claim KCP pedigree.
- Animal welfare reporting must be available.

### United States

- Capture breeder licensing data where applicable.
- Capture USDA APHIS license status where applicable.
- Support state-specific commercial breeder rules.
- Support state-specific pet purchaser protection disclosures.
- Support health certificate and refund/remedy windows by state.
- Do not launch USA pet transactions without legal review of state coverage.

## Privacy Rules

- Health records are private by default.
- Payment proofs are private.
- Identity and inspection evidence are private.
- Public listing pages must not expose phone numbers by default.
- Analytics must not include private health details, full message text, payment proof content, or government identity documents.

## Notification Consent Rules

- Marketing and promotional notifications require explicit opt-in, recorded with type and version in the `consents` table.
- SMS and email campaigns must honor stop/unsubscribe requests and respect PECA (Pakistan) and TCPA (USA) expectations.
- Transactional notifications tied to a user's own active workflow are permitted, but notification categories and channels must be user-configurable.

## Data Retention and Deletion Rules

- Define retention periods per data class before launch; do not apply storage lifecycle deletion until legal and business retention requirements are set (see `Setup.md`).
- Support user account deletion / right-to-erasure: soft-delete user-visible records, redact personal identifiers, and retain only what is legally required for financial, audit, and dispute records.
- Financial ledger and audit entries are retained per legal/accounting requirements and are exempt from user-initiated deletion.
- Align retention and deletion handling with applicable data-protection law (including Pakistan's draft Personal Data Protection Bill and USA state requirements); confirm with legal review before launch.

## Audit Event Requirements

Audit these actions:

- Role changes.
- Account suspension/reactivation.
- Animal profile publish/unpublish.
- Verification approve/reject.
- Breeding request status change.
- Payment reconciliation.
- Refund initiation.
- Payout approval/release.
- Dispute open/resolve.
- Review moderation (approve/hide).
- Consent grant/withdrawal.
- Admin document access.
- RLS bypass/service-role operations.

## Abuse and Safety Rules

- Support can suspend a listing immediately for suspected fraud, cruelty, disease risk, or illegal services.
- Repeat cancellation or dispute abuse should reduce ranking.
- Listings for exotic animals require explicit category approval.
- Prohibited species, illegal wildlife, fighting animals, and cruel practices are not allowed.

## Checkpoint

Any implementation that violates these rules requires a documented product and legal decision before release.

