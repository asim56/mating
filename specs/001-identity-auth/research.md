# Phase 0 Research: Identity & Authentication

Resolves the unknowns and "industry default" deferrals in the spec's Assumptions, plus the
integration choices implied by the M0 scaffold (in-memory repositories and the structural
JWT verifier were explicitly deferred to "IDENTITY-01"). Each item: Decision / Rationale /
Alternatives considered.

## 1. Identity provider: Supabase Auth (GoTrue)

- **Decision**: Use Supabase Auth as the credential store and token issuer for phone-OTP,
  email/password, email verification, and password recovery. The NestJS API never stores
  passwords or OTP secrets; it calls Supabase Auth (admin API via service role) and verifies
  the JWTs Supabase issues.
- **Rationale**: Constitution mandates JWT + Supabase Auth/RLS. GoTrue already implements
  single-use time-limited OTP, password hashing, email confirmation, and recovery — building
  these in-house would duplicate security-critical code. Phone/email uniqueness is enforced by
  Supabase + a DB unique constraint.
- **Alternatives considered**: Custom auth tables + bcrypt + self-managed OTP (rejected:
  reinvents audited security primitives, violates YAGNI); third-party auth (Auth0/Clerk)
  (rejected: extra vendor, conflicts with the mandated Supabase stack).

## 2. Access-token verification: JWKS via `jose`

- **Decision**: Replace `StructuralTokenVerifier` with a `JwksTokenVerifier` that verifies
  Supabase access-token signature, `exp`, `aud` (`JWT_AUDIENCE`), and `iss` (`JWT_ISSUER`)
  using Supabase's JWKS endpoint (cached). Keep the existing `TokenVerifier` interface and
  `JwtAuthGuard` contract; only the injected implementation changes.
- **Rationale**: The guard was designed for this swap; JWKS verification is the standard,
  signature-validating approach and keeps the API stateless for the common path.
- **Alternatives considered**: Shared HMAC secret verification (works only with the legacy
  symmetric JWT secret; rejected in favor of asymmetric JWKS which rotates cleanly);
  introspection call per request (rejected: latency + coupling).

## 3. Session model + ≤1-minute revocation (FR-006/007/008, SC-003)

- **Decision**: Mirror each authenticated session into a server-owned `public.sessions` row
  (id = Supabase `session_id` claim, account, device descriptor, IP/UA, created/last-seen,
  `status` = active|revoked). The `JwtAuthGuard` performs one indexed lookup on the token's
  `session_id` and rejects the request if the session is missing or `revoked`. Revoking a
  session (user or admin) sets `status='revoked'` AND calls Supabase Auth admin sign-out so
  the refresh token cannot mint new access tokens. Access-token lifetime is configured to
  **≤60s** so any still-valid access token also expires within the SC-003 window even before
  the next guard lookup.
- **Rationale**: Stateless JWTs alone cannot be revoked before `exp`; a server-checked
  session gives immediate (<1 min, effectively per-request) revocation as required, satisfies
  FR-007 visibility, and needs no Redis (YAGNI) — a single indexed primary-key lookup is cheap
  at MVP scale. The short access-token TTL bounds the worst case for multi-instance/cache
  scenarios.
- **Alternatives considered**: Pure stateless JWT with long TTL (rejected: cannot meet
  SC-003); Redis denylist (rejected: new infra, not justified at MVP — revisit if per-request
  DB lookup becomes a bottleneck); in-memory revocation cache refreshed every 30s (kept as a
  documented future optimization, not required now).

## 4. Phone number format, regional auth paths & OTP parameters (FR-001/001a/002/013)

- **Decision**: **Dual geography auth paths**:
  - **Pakistan (PK)**: Phone-OTP primary. Accept E.164 `+92` + 10-digit national number
    (`^\+92\d{10}$`), normalized before storage.
  - **United States (US)**: Email/password primary with mandatory email verification before
    sign-in or recovery. Optional US phone (`^\+1\d{10}$`) MAY be added to profile but is
    not required for account creation.
  - OTP parameters (PK phone path): **6 numeric digits**, **5-minute** validity,
    **single-use**, **max 5 verify attempts** per challenge, **60-second resend cooldown**,
    and the `auth` rate-limit category caps requests per identifier/IP. Values in
    `@mating/shared` and Supabase Auth config.
- **Rationale**: Aligns with `000-product-scope` dual launch; PK phone-first and US
  email-first without forcing PK OTP on US users.
- **Alternatives considered**: PK-only phone format globally (rejected: conflicts with dual
  geography scope); full US phone-OTP parity at M1 (rejected: email-first is the US primary
  path per product scope).

## 5. Password strength rules (FR-003)

- **Decision**: Minimum **10 characters**, requiring at least one letter and one digit;
  reject known-breached passwords using Supabase Auth's leaked-password protection (HIBP). No
  forced rotation. Enforced both client-side (UX) and by Supabase Auth (authority).
- **Rationale**: Aligns with current NIST-style guidance (length + breach check over arbitrary
  composition rules) and is natively supported by Supabase Auth.
- **Alternatives considered**: Complex symbol/upper/lower mandates (rejected: hurts usability
  for low-digital-literacy audience without proportional security gain); 8-char minimum
  (rejected: weaker, 10 is a low-cost upgrade).

## 6. Email verification & recovery (FR-004a/009)

- **Decision**: Email ownership is confirmed via Supabase Auth email confirmation
  (link/code) before the email can sign in or serve as recovery. Recovery uses phone-OTP
  re-auth (phone accounts) or Supabase password-recovery email (email accounts). On
  successful recovery the service revokes all of the account's sessions (sets `sessions`
  rows to `revoked` + Supabase global sign-out) and issues one fresh session. Recovery
  responses are uniform regardless of account existence (SC-007).
- **Rationale**: Mirrors the phone-OTP ownership guarantee, uses built-in flows, and the
  global sign-out closes the compromised-account attack path per the clarification.
- **Alternatives considered**: Recovery that leaves other sessions active (rejected by
  clarification); magic-link-only recovery (rejected: phone-first audience may lack email).

## 7. Roles & account-status storage (FR-011/012a/012b/014)

- **Decision**: `public.user_roles` (account_id, role, granted_by, granted_at) using the
  existing `USER_ROLES` enum; self-select at sign-up limited to `{buyer, breeder,
  animal_owner}` (default `buyer`), with `{super_admin, support_agent, veterinarian,
  inspector}` admin-assigned only. `public.account_status` (account_id, status
  active|suspended, reason, changed_by, changed_at). The initial `super_admin` is granted by
  a seed/bootstrap step keyed on a configured identifier (`ADMIN_BOOTSTRAP_IDENTIFIER`) run
  with the service role; no public path grants admin.
- **Rationale**: Reuses canonical role constants; separates fast-changing status from roles;
  out-of-band bootstrap satisfies FR-012a without a self-service hole. Suspension is enforced
  at authorization time (a suspended account fails protected-action checks) per the spec edge
  case, not by destroying sessions.
- **Alternatives considered**: Roles as a JWT claim only (rejected: needs DB source of truth
  for admin assignment + RLS); allowing self-select of sensitive roles (rejected by
  clarification).

## 8. Database access layer & first Supabase client

- **Decision**: Introduce `apps/api/src/infra/supabase/` providing a singleton **service-role**
  `SupabaseClient` (server-only) used by **all M1 modules** (`identity`, `users`, `regions`,
  `breeds`, `audit`, `analytics`, `notifications`) for `public` table access and Auth admin
  operations. Upgrade existing in-memory `regions`/`breeds` repositories to Supabase-backed
  implementations in this feature.
- **Rationale**: One server client keeps wiring simple (YAGNI), centralizes the service-role
  key, and is the seam the M0 code already anticipated ("Supabase-backed implementation lands
  with the database client in IDENTITY-01").
- **Alternatives considered**: Direct `pg`/`postgres` SQL client (rejected for now: adds a
  second connection mechanism; supabase-js covers table + auth-admin needs); per-request
  anon client with user JWT (rejected as the default: server actions need service role; RLS
  remains the DB safety net).

## 9. Audit, analytics & notifications scope (FR-014–015, FR-022–024)

- **Decision**: Ship full M1 cross-cutting cores in this feature:
  - `audit_logs` append-only with DB grants revoking UPDATE/DELETE; emitter for all M1
    privileged actions (role, status, session, region config, consent).
  - `analytics_events` with privacy filters; emit `user_signed_up` with region + method only.
  - `outbox_messages`, `notification_logs`, `devices` with transactional outbox writes in the
    same DB transaction as state changes; scheduled drainer with stub `NotificationProvider`
    and en/ur template lookup.
  Replace `LoggingAuditEmitter` stubs in regions/breeds with the real audit module.
- **Rationale**: `000-product-scope` folds M0+M1 together; constitution requires audit from
  day one; outbox must exist before M4 workflow notifications.
- **Alternatives considered**: Audit/outbox as separate features (rejected: violates scope
  lock and delays M4 producers).

## 10. Region & breed seed (FR-018/019)

- **Decision**: Seed `regions` with PK (PKR, `en`/`ur`, Easypaisa/JazzCash/bank stub
  metadata) and US (USD, `en`, Stripe stub metadata). Seed `breeds` for PK priority species
  (cattle, buffalo, goat, sheep, dog) with unique `(species, name, region_id)`. Eligibility
  jsonb uses conservative PK defaults (min age/health by species).
- **Rationale**: Dual geography product surfaces require both rows at M1; breeds unblock M2.
- **Alternatives considered**: PK-only seed (rejected: conflicts with dual launch scope).

## 11. New environment & configuration

- **Decision**: Reuse existing env (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `JWT_AUDIENCE`, `JWT_ISSUER`, `SMS_PROVIDER`, Twilio + Resend
  keys). Add `ADMIN_BOOTSTRAP_IDENTIFIER` (phone/email seeded as super_admin) and make
  Supabase secrets **required in staging/production** (closes the M0 fail-fast note).
  Configure Supabase Auth: phone provider = Twilio, access-token TTL ≤60s, email confirmations
  on, leaked-password protection on.
- **Rationale**: Minimizes new config; fixes the known M0 production-secret risk as part of
  the first feature that truly needs the keys.
- **Alternatives considered**: New bespoke OTP/email config vars (rejected: Supabase Auth owns
  delivery).

## Open items deferred (not blocking)

- Final data-retention periods for identity data → launch hardening (M7), per spec Assumptions.
- Optional social sign-in (FR-017) → not implemented; design leaves room via Supabase Auth
  providers without affecting other criteria.
- `contracts/profiles.md` and `contracts/regions.md` → ✅ added 2026-06-30.
- `data-model.md` tables for regions, profiles, outbox → expand before tasks generation.
