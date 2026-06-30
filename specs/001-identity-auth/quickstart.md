# Quickstart & Validation: Identity & Authentication

End-to-end validation that the feature works. Implementation details live in `data-model.md`,
`contracts/`, and `tasks.md`. This guide is for running and proving the acceptance scenarios.

## Prerequisites

- Node >=22, pnpm >=9, Docker (for local Supabase), Supabase CLI.
- `.env` populated from `.env.example` with local Supabase keys. For staging/production,
  Supabase secrets are now **required** (no dev defaults).
- New env: `ADMIN_BOOTSTRAP_IDENTIFIER` set to the phone/email that should become the first
  `super_admin`.

## Setup

```bash
pnpm install
supabase start                       # local Postgres + Auth (GoTrue)
supabase db reset                    # applies migrations incl. 20250703000000_identity.sql + seed
pnpm --filter @mating/api dev        # API on http://localhost:4000/api/v1
pnpm --filter @mating/web dev        # web on http://localhost:3000
```

Supabase Auth config to verify (local `supabase/config.toml` / dashboard): phone provider =
Twilio (or `local` for dev log), access-token TTL ≤ 60s, email confirmations ON,
leaked-password protection ON.

## Validation scenarios (map to spec acceptance criteria)

### US1 — Phone-first sign up & sign in (P1)

1. `POST /auth/otp/request` `{ "phone": "+923001234567" }` → `200 { status: "sent" }`.
2. `POST /auth/otp/verify` with the code (dev: read from Auth logs) → `200` with
   `accessToken` + `session`; account created, phone verified, `user_signed_up` emitted.
3. Call `GET /me/sessions` with the token → the new session is listed (`current: true`).
4. Wrong/expired code → `401 UNAUTHENTICATED`, no session (scenario 2).
5. Repeat requests past the cap → `429 RATE_LIMITED` with `Retry-After` (scenario 4).
6. Sign out (`POST /auth/logout`), request a fresh OTP, verify → signed in, no duplicate
   account (scenario 3).

### US2 — Email/password & adding email (P2)

1. `POST /auth/register` → `202 verification_sent`; `POST /auth/login` before verifying →
   `401`. After `POST /auth/email/verify` → `POST /auth/login` returns a session.
2. Re-register an existing email → identical `202` shape (no enumeration).
3. On a phone account, `POST /me/email` then verify → both phone-OTP and email/password sign
   in to the SAME account.
4. Adding an email already linked elsewhere → `409 CONFLICT`.

### US3 — Recovery & session visibility (P2)

1. `POST /auth/recover` for a real and a fake identifier → identical `200` (SC-007).
2. `POST /auth/recover/confirm` → new session issued AND all prior sessions now `revoked`
   (verify a previously captured token now returns `401`).
3. `GET /me/sessions` lists devices; `POST /me/sessions/revoke { sessionId }` → that session's
   token returns `401` within 1 minute (SC-003).

### US4 — Administrative control (P2)

1. Bootstrap: with `ADMIN_BOOTSTRAP_IDENTIFIER` set, run the seed; that account has
   `super_admin`. A non-admin calling any `/admin/*` route → `403`.
2. `PATCH /admin/users/:id/status { status: "suspended" }` → target blocked from protected
   actions; audit row written (`account.suspended`). Reactivate restores access.
3. `POST /admin/users/:id/revoke-sessions` → all target sessions end within 1 minute; audit
   row written.
4. `POST /admin/users/:id/roles { role: "veterinarian" }` succeeds as admin; the same grant is
   impossible via any public/self-service route (FR-012b).

## Automated test expectations (DoD)

- State-transition tests: `account_status` active↔suspended; `sessions` active→revoked.
- RBAC tests: every `/admin/*` route rejects non-admins; self-select sign-up cannot assign
  sensitive roles.
- Audit tests: each privileged action writes exactly one `audit_logs` row; `audit_logs`
  UPDATE/DELETE are rejected at the DB level.
- Privacy test: `analytics_events.properties` never contains phone/email/OTP/password.
- Guard test: revoked/expired token → `401`; JWKS verification rejects bad signature/aud/iss.

## Done checks

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass.
- OpenAPI export matches the live graph (CI drift gate green).
- Migration applies and reverses (documented down) via `supabase db reset`.
