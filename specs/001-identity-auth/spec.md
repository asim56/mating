# Feature Specification: Identity, Profiles & Platform Foundation (M1 + inline M0)

**Feature Branch**: `001-identity-auth`

**Created**: 2026-06-29

**Status**: Draft (amended 2026-06-30 per `specs/000-product-scope`)

**Input**: M1 keystone + inline M0 foundation per end-to-end product scope lock: dual
geography (PK + US product surfaces), M0 folded into this feature, full Checkpoint 1
(identity, profiles, regions/breeds seed, audit/analytics/notifications/outbox cores).

**Parent scope**: [000-product-scope](../000-product-scope/spec.md)

## Scope

### In scope — M0 foundation (inline)

Platform prerequisites that must ship with this feature so later milestones start on a
stable base:

- Global API conventions (validation pipe, stable error codes, cursor pagination helper).
- Rate-limit matrix for auth, search, messaging, and request-creation categories.
- JWT + RBAC guard scaffolding and reusable RBAC/RLS state-transition test harness.
- CI gates for SQL migration validation and OpenAPI drift.
- Web RTL + i18n shell (English + Urdu) with locale-driven `dir` switching.
- Base UI state patterns (loading/empty/error/success) in the design system.
- API host decision documented; README documentation drift fixes.

### In scope — M1 identity & profiles

- Account creation and sign-in (PK phone-first, US email-first, shared email/password).
- Sessions, recovery, administrative account control.
- User profiles, role assignment, notification preferences, marketing consent.
- Region configuration seeded for **Pakistan** and **United States**.
- Breed taxonomy seed for priority PK species.
- Cross-cutting cores: append-only audit, analytics ingestion, notifications outbox +
  device registration (stub delivery).

### Out of scope

- Animal profiles, listings, discovery, breeding workflow, payments (M2+).
- Live Easypaisa/JazzCash/Stripe merchant integrations.
- Optional social sign-in (MAY be added later without blocking other criteria).
- Final data-retention periods (defined in M7 launch hardening).

## User Scenarios & Testing *(mandatory)*

This feature lets people in **Pakistan and the United States** create accounts, complete
profiles, and sign in using region-appropriate methods. It also delivers the platform
foundation and cross-cutting trust plumbing every later feature depends on.

### User Story 1 - Phone-first sign up and sign in (Priority: P1)

A new user in Pakistan signs up using their mobile phone number, receives a one-time
passcode (OTP) by SMS, enters it to verify ownership of the number, and is signed in.
On return visits they sign in the same way.

**Why this priority**: Phone-first onboarding is a non-negotiable Pakistan-first
requirement and the single most important path to acquiring breeding supply and demand.
Delivered alone, it is a viable MVP: a person can create a verified account and hold a
session, which unlocks all downstream onboarding.

**Independent Test**: Sign up with a Pakistan-format phone number, complete OTP
verification, confirm an authenticated session is established, sign out, and sign back in
with a fresh OTP.

**Acceptance Scenarios**:

1. **Given** a visitor with a valid Pakistan-format phone number, **When** they request
   sign up and submit the correct OTP within its validity window, **Then** an account is
   created, the phone number is marked verified, and an authenticated session is returned.
2. **Given** a visitor who submits an incorrect or expired OTP, **When** they attempt to
   verify, **Then** verification is rejected with a clear reason and no session is created.
3. **Given** an existing user, **When** they request a sign-in OTP and submit it
   correctly, **Then** they are signed in without creating a duplicate account.
4. **Given** a user who requests OTPs repeatedly, **When** they exceed the allowed
   request rate, **Then** further requests are throttled with a retry indication.

### User Story 2 - US email-first sign up and sign in (Priority: P1)

A new user in the United States registers with email and password, verifies email ownership,
selects their region (US), and completes a profile. On return visits they sign in with email
and password.

**Why this priority**: Dual geography requires a viable US onboarding path from day one;
email-first is the primary US auth method per product scope.

**Independent Test**: Register with a US-region context using email/password, verify email,
complete profile with USD region, sign out, and sign back in.

**Acceptance Scenarios**:

1. **Given** a US-region visitor, **When** they register with a valid unique email and
   password meeting strength rules and verify email, **Then** an account is created with US
   region context and an authenticated session is returned.
2. **Given** a US-region user, **When** they sign in with correct credentials, **Then** they
   are authenticated without duplicate account creation.
3. **Given** a US-region user, **When** they optionally add a US-format phone number, **Then**
   it is stored but phone OTP is not required for US-primary accounts.

---

### User Story 3 - Email/password and adding email to a phone account (Priority: P2)

A user can alternatively register with email and password (any region), and a phone-first
user can add an email address (and password) to their existing account so they have a second
way to sign in and to receive account communications.

**Why this priority**: Email/password broadens reach across both regions; adding email to a
phone account improves recoverability, but it is secondary to each region's primary path.

**Independent Test**: Register a new account with email and password and sign in; then,
on a separate phone-first account, add an email and confirm both phone-OTP and
email/password sign-in work for that same account.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they register with a valid, unique email and a password
   meeting strength rules, **Then** an account is created and they can sign in with those
   credentials.
2. **Given** a visitor using an email already tied to an account, **When** they try to
   register, **Then** registration is rejected without revealing sensitive account detail.
3. **Given** a signed-in phone-first user, **When** they add an email and password,
   **Then** the email is associated with the same account and can be used to sign in.
4. **Given** a user signing in with a wrong password, **When** they exceed the allowed
   attempt rate, **Then** sign-in attempts are throttled.

### User Story 4 - Profile completion, region, and role (Priority: P2)

After sign-up, a user completes their marketplace profile (display name, region, primary
role among buyer/breeder/owner), and can update it later. Region drives currency display
and eligibility context for downstream features.

**Why this priority**: Profiles and region binding are required before animal supply (M2)
and enable correct PK vs US behavior across the product.

**Independent Test**: Complete sign-up, fill required profile fields including region and
role, fetch own profile via authenticated session, update a field, confirm changes persist.

**Acceptance Scenarios**:

1. **Given** a newly signed-in user without a complete profile, **When** they submit required
   fields (display name, region, primary role), **Then** the profile is saved and marked
   complete.
2. **Given** a signed-in user, **When** they update their display name or notification
   preferences, **Then** changes persist and are visible on subsequent reads.
3. **Given** a user with region Pakistan, **When** they view their profile, **Then** PKR
   and PK eligibility context are reflected; US users see USD context.

---

### User Story 5 - Bilingual shell and locale (Priority: P2)

A user can use the marketplace shell in English or Urdu. When Urdu is selected, the layout
renders right-to-left without broken navigation or unreadable auth forms.

**Why this priority**: Pakistan launch requires Urdu RTL from the first user-facing screens;
deferring RTL causes expensive retrofit (M0 risk).

**Independent Test**: Switch locale between English and Urdu on auth and profile screens;
confirm `dir=rtl` layout, translated strings (no hardcoded copy in shell), and usable forms.

**Acceptance Scenarios**:

1. **Given** a visitor, **When** they select Urdu, **Then** the shell renders RTL and auth
   labels appear in Urdu.
2. **Given** a visitor, **When** they select English, **Then** the shell renders LTR with
   English copy.

---

### User Story 6 - Notification preferences and marketing consent (Priority: P3)

A user can configure which notification categories they receive per channel and must
explicitly opt in to marketing communications with a recorded consent version.

**Why this priority**: Required for compliant notifications in later milestones; can follow
core auth but must exist before breeding/payment notifications.

**Independent Test**: Set notification preferences, opt in to marketing, verify consent
record exists; opt out and confirm withdrawal is recorded.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they disable a non-transactional category, **Then**
   the preference is saved.
2. **Given** a user who has not opted in, **When** marketing would be sent, **Then** it is
   suppressed until explicit opt-in with type and version is recorded.

---

### User Story 7 - Account recovery and session/device visibility (Priority: P2)

A user who loses access can recover their account through a verified channel (phone OTP or
email), and any user can see where they are signed in and sign out of a specific device or
of all devices.

**Why this priority**: Recovery prevents permanent lockout for a low-digital-literacy
audience, and session visibility builds the trust the marketplace depends on. It is
important but can follow the core sign-up/sign-in paths.

**Independent Test**: Trigger account recovery via a verified channel and regain access;
view the list of active sessions/devices and revoke one, confirming that session can no
longer act.

**Acceptance Scenarios**:

1. **Given** a user who cannot sign in, **When** they complete recovery through a verified
   phone or email channel, **Then** they regain access and any compromised sessions can be
   ended.
2. **Given** a signed-in user, **When** they view their account, **Then** they see their
   active sessions/devices with enough context (e.g., last activity, device descriptor) to
   recognize them.
3. **Given** a signed-in user, **When** they revoke a specific session or all sessions,
   **Then** the revoked session(s) can no longer perform authenticated actions.

### User Story 8 - Administrative account and region control (Priority: P2)

An administrator can suspend or reactivate a user account and can force a user to be
signed out by revoking all their sessions. A suspended user is blocked from privileged
actions across the platform.

**Why this priority**: Trust, safety, and abuse response require the platform to cut off a
bad actor immediately. It is essential for a trusted marketplace but depends on the core
account model existing first.

**Independent Test**: As an administrator, suspend a user and confirm that user can no
longer perform protected actions and that an audit record was created; reactivate them and
confirm access is restored.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they revoke a target user's sessions, **Then** all
   of that user's active sessions end and the action is recorded in the audit trail.
2. **Given** an administrator, **When** they suspend an account, **Then** the suspended
   user is prevented from performing privileged/protected actions and the change is
   audited.
3. **Given** an administrator, **When** they update region configuration, **Then** the change
   is audited and non-admins cannot modify region config.
4. **Given** a suspended user, **When** they attempt a protected action, **Then** it is
   refused with a clear, non-leaking reason.
5. **Given** a non-administrator, **When** they attempt any administrative account action,
   **Then** the action is refused.

### Edge Cases

- OTP requested for a malformed or non-Pakistan-format number when PK phone auth is used →
  request rejected with a validation message; no OTP sent.
- US user attempts PK-only phone OTP as primary sign-up without email → guided to email-first
  path; no account created via unsupported method.
- OTP reuse after successful verification → rejected (single-use).
- Concurrent sign-up attempts for the same phone/email → only one account is created.
- Recovery initiated for a non-existent account → the response does not reveal whether the
  account exists.
- Adding an email already linked to a different account → rejected.
- A revoked or expired session presenting an old token → treated as unauthenticated.
- Suspended user holding a still-valid session → blocked at the point of any protected
  action.
- SMS delivery failure or delay → user can request a new OTP after a cooldown without
  being permanently blocked.
- Profile completion attempted with an inactive or unknown region → rejected with validation
  error.
- Marketing notification attempted without recorded opt-in → suppressed.
- CI pipeline with malformed migration or OpenAPI drift → build fails before merge.

## Clarifications

### Session 2026-06-30 (scope lock)

- Q: End-to-end product geography? → A: Dual launch — PK and US product surfaces from M1.
- Q: M0 foundation handling? → A: Folded inline into this feature (not a separate spec).
- Q: Payments depth for later milestones? → A: Bank-transfer proof + provider stubs (not
  relevant to this feature but informs region payment metadata seed).

### Session 2026-06-30 (auth details)

- Q: Max acceptable delay between revoking a session and it being unable to act? → A: Within 1 minute (align FR-008 to SC-003; brief propagation allowed).
- Q: How is the first administrator established? → A: Provisioned out-of-band via seed/config at deployment; no public self-service admin path.
- Q: What role(s) does a new account hold right after sign-up? → A: User picks a primary self-service role (buyer/breeder/owner) during sign-up; sensitive roles (vet/inspector/support/admin) are admin-assigned only.
- Q: On successful account recovery, what happens to existing sessions? → A: Automatically revoke all existing sessions and issue one fresh session.
- Q: Must email ownership be verified before use? → A: Yes — email must be verified (confirmation link/code) before it can be used to sign in or as a recovery channel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a visitor in the **Pakistan region** to create an
  account using a Pakistan-format phone number verified by a single-use, time-limited OTP
  delivered via SMS.
- **FR-001a**: The system MUST allow a visitor in the **United States region** to create
  an account using email and password with verified email ownership as the primary path;
  phone number MAY be optional for US accounts.
- **FR-002**: The system MUST allow an existing user to sign in via phone OTP without
  creating a duplicate account.
- **FR-003**: The system MUST allow a visitor to register and sign in using an email
  address and a password that meets defined strength rules.
- **FR-004**: The system MUST allow a phone-first user to add an email and password to
  their existing account, after which both methods authenticate the same account.
- **FR-004a**: The system MUST verify ownership of an email address (via a confirmation
  link/code) before that email can be used to sign in or serve as an account-recovery
  channel; an unverified email MUST NOT be usable for sign-in or recovery.
- **FR-005**: The system MUST enforce uniqueness of phone number and of email across
  accounts.
- **FR-006**: The system MUST issue an authenticated session upon successful sign-up or
  sign-in and MUST reject expired or revoked sessions on subsequent requests.
- **FR-007**: The system MUST record each active session/device with enough metadata for a
  user to recognize it and MUST allow a user to view their active sessions.
- **FR-008**: The system MUST allow a user to revoke a specific session or all of their
  sessions, ending the revoked session(s)' ability to perform any authenticated action
  within 1 minute of revocation (consistent with SC-003).
- **FR-009**: The system MUST provide account recovery through a verified channel (phone
  OTP or email) that restores access without exposing whether an account exists for an
  unknown identifier. On successful recovery, the system MUST revoke all of the account's
  existing sessions and issue a single new session.
- **FR-010**: The system MUST allow an administrator to revoke all sessions of a target
  user (force logout).
- **FR-011**: The system MUST allow an administrator to suspend and reactivate an account,
  and MUST block suspended accounts from performing privileged/protected actions.
- **FR-012**: The system MUST restrict all administrative account actions to authorized
  administrators and refuse them for everyone else.
- **FR-012a**: The system MUST establish the initial administrator out-of-band (via secure
  seed/configuration at deployment) and MUST NOT expose any public, self-service path to
  obtain administrator privileges; subsequent admins are granted by an existing admin.
- **FR-012b**: On sign-up, the system MUST let the user self-select a primary
  customer-facing role from {buyer, breeder, owner} (defaulting to buyer if none chosen),
  and MUST restrict assignment of sensitive roles (vet, inspector, support, admin) to
  administrators only.
- **FR-013**: The system MUST rate-limit authentication-sensitive operations (OTP
  requests, sign-in attempts, recovery requests) and return a clear retry indication when
  a limit is reached.
- **FR-014**: The system MUST emit auditable events for privileged account actions,
  including role/status changes, account suspension/reactivation, and session revocation.
- **FR-015**: The system MUST emit an analytics signal when a new account is created
  (e.g., a `user_signed_up` event) without capturing sensitive identity content.
- **FR-016**: The system MUST return stable, non-leaking error responses for invalid
  credentials, invalid/expired OTPs, and unauthorized actions (no disclosure of whether an
  identifier exists or why credentials failed).
- **FR-017**: Optional social sign-in MAY be supported but is not required for this
  feature; if absent, all other criteria still hold.
- **FR-018**: The system MUST seed **Pakistan** and **United States** region configuration
  (currency, default locale, active flag, eligibility/compliance and payment-provider
  metadata) and MUST expose region data to authenticated flows.
- **FR-019**: The system MUST seed priority breed taxonomy for Pakistan (cattle, buffalo,
  goat, sheep, dog) linked to region context.
- **FR-020**: The system MUST require profile completion after sign-up with display name,
  region, and primary self-service role; users MUST be able to read and update their own
  profile.
- **FR-021**: The system MUST let users configure notification preferences per channel and
  category; marketing/promotional notifications MUST require explicit opt-in recorded with
  consent type and version; consent grant and withdrawal MUST be audited.
- **FR-022**: The system MUST provide an append-only audit trail for all privileged actions
  in this feature, with database-level immutability (no update/delete on audit rows).
- **FR-023**: The system MUST capture analytics events (including `user_signed_up`) with
  region and method metadata and without sensitive identity, health, or payment payloads.
- **FR-024**: The system MUST persist transactional outbox messages in the same database
  transaction as state changes that trigger notifications; a drainer MUST process pending
  outbox rows idempotently using a stub notification provider.
- **FR-025**: The system MUST enforce a documented rate-limit matrix across auth, search,
  messaging, and request-creation categories, returning HTTP 429 with a retry indication
  when limits are exceeded.
- **FR-026**: The system MUST ship reusable RBAC and RLS test harness helpers exercised in
  CI for role and state-transition assertions.
- **FR-027**: The system MUST support English and Urdu locales in the web shell with
  correct RTL layout for Urdu and translation keys (no hardcoded user-facing copy in shell
  or auth flows).
- **FR-028**: CI MUST fail on malformed SQL migrations or OpenAPI contract drift relative
  to the live API graph.
- **FR-029**: Administrators MUST be able to list/search users with cursor pagination and
  read/update region configuration; all such actions MUST be audited.

### Key Entities *(include if feature involves data)*

- **Account**: A person's identity on the platform. Key attributes: unique identifier,
  verified phone number, optional email, account status (active/suspended), creation time.
  Holds one or more authentication methods.
- **Authentication Method**: A way to prove identity for an account (phone OTP,
  email/password, optionally social). An account may have more than one.
- **OTP Challenge**: A single-use, time-limited passcode bound to a phone number (or
  recovery channel), with issue time, expiry, and consumed state.
- **Session/Device**: A record of an authenticated session, including device descriptor,
  last activity, creation time, and active/revoked state. Belongs to one account.
- **Role Assignment**: The platform role(s) granted to an account (e.g., admin, breeder,
  owner, vet, inspector, buyer, support), used to authorize actions.
- **Profile**: User-visible identity (display name, region, locale preferences, completion
  state) bound to one account.
- **Region**: Launch geography with currency, locale defaults, and jsonb eligibility/
  compliance and payment metadata.
- **Breed**: Species/breed taxonomy entry linked to a region for downstream animal
  registration.
- **Notification Preference**: Per-channel, per-category delivery settings for an account.
- **Consent**: Recorded marketing opt-in/opt-out with type, version, and timestamp.
- **Outbox Message**: Durable notification intent written atomically with domain state
  changes, pending delivery by the drainer.
- **Audit Event**: An immutable record of a privileged account action (actor, subject,
  action, time, context) consumed by the audit trail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can complete phone-OTP sign-up (from entering their number
  to an authenticated session) in under 2 minutes on a typical mobile connection.
- **SC-002**: At least 95% of OTPs that are deliverable are usable within their validity
  window (i.e., users who receive an OTP can verify on the first correct attempt).
- **SC-003**: 100% of administrative session revocations take effect within 1 minute,
  after which the revoked sessions can perform no authenticated action.
- **SC-004**: 100% of privileged account actions (suspend/reactivate, role change, session
  revocation) produce a corresponding audit record.
- **SC-005**: Suspended accounts are blocked from 100% of protected actions they attempt.
- **SC-006**: Authentication-sensitive endpoints throttle abusive volume so that
  repeated automated attempts are rejected before exceeding the configured per-category
  limits.
- **SC-007**: Account recovery responses do not reveal account existence for unknown
  identifiers in any tested case.
- **SC-008**: Both Pakistan and United States region seeds are present and selectable at
  profile completion in staging.
- **SC-009**: Urdu locale renders auth and profile shell screens in RTL without layout
  breakage in visual regression or manual QA checklist.
- **SC-010**: CI rejects PRs that introduce OpenAPI drift or invalid migrations in 100% of
  tested pipeline runs.
- **SC-011**: Outbox drainer processes a test notification idempotently (no duplicate
  delivery on replay).

## Assumptions

- **Dual geography** is in scope from M1: Pakistan (phone-first, PKR, en/ur) and United
  States (email-first, USD, en). Phone OTP for PK uses E.164 `+92`; optional US phones use
  E.164 `+1` when provided.
- OTP delivery depends on an external SMS channel; deliverability is a known external risk
  and is handled with cooldowns/retries rather than guaranteed instant delivery.
- "Privileged/protected actions" that a suspended user is blocked from include creating
  listings and breeding requests once those features exist; for this feature the
  enforceable guarantee is that suspended accounts cannot pass authorization for any
  protected action.
- Role definitions (admin, breeder, owner, vet, inspector, buyer, support, and the scoped
  Field Onboarding Rep variant) follow the product RBAC matrix; this feature establishes
  account status, role-assignment, and profile plumbing; role-specific business capabilities
  ship with their own features.
- Social sign-in is optional and out of scope for the minimum delivery.
- Password strength rules, OTP length/validity, and rate-limit thresholds use sensible
  industry defaults documented in the implementation plan and shared constants.
- Notification delivery in this feature uses a **stub provider**; localized templates
  (en/ur) are looked up but live SMS/email for domain events beyond Supabase Auth is not
  required until later milestones wire producers.
- Data retention and right-to-erasure for identity data follow the platform retention
  policy, finalized in launch hardening (M7); this feature does not set final retention
  periods.
- M0 inline work ships in the same release train as M1 identity; there is no separate M0
  deployment gate.
