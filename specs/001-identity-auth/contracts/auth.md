# Contract: Authentication endpoints

All paths under `/api/v1`. Public (no auth) unless noted. Errors use the stable
`{ code, message, details? }` body. Auth-sensitive routes use the `auth` rate-limit category
(429 `RATE_LIMITED` with `Retry-After`). Error responses are uniform and non-leaking
(FR-016, SC-007): they never disclose whether an identifier exists or why credentials failed.

## POST /auth/otp/request

Request a phone-OTP for sign-up or sign-in. (FR-001, FR-002, FR-013)

- Body: `{ "phone": "+92XXXXXXXXXX" }`
- 200: `{ "status": "sent", "resendAfterSeconds": 60 }` (same shape whether or not the number
  already has an account)
- 400 `VALIDATION_FAILED`: malformed / non-PK phone (no OTP sent)
- 429 `RATE_LIMITED`: too many requests (resend cooldown or category cap)

## POST /auth/otp/verify

Verify an OTP; creates the account on first verify, else signs in. (FR-001, FR-002, FR-006)

- Body: `{ "phone": "+92XXXXXXXXXX", "code": "123456", "role?": "buyer|breeder|animal_owner",
  "deviceDescriptor?": "string" }`
- 200: `{ "accessToken", "refreshToken", "expiresIn", "account": { "id", "status" },
  "session": { "id", "createdAt" } }`; on first verify the phone is marked verified, a
  default/selected self-service role is assigned, and `user_signed_up` analytics is emitted.
- 401 `UNAUTHENTICATED`: incorrect/expired/consumed OTP (single-use); no session created
- 429 `RATE_LIMITED`: exceeded verify attempts

## POST /auth/register (email/password)

Register with email + password. (FR-003, FR-004a, FR-005)

- Body: `{ "email", "password", "role?": "buyer|breeder|animal_owner" }`
- 202: `{ "status": "verification_sent" }` — account created in unverified state; a
  confirmation link/code is sent; email is NOT usable for sign-in until verified.
- 400 `VALIDATION_FAILED`: weak password (min 10 chars, letter+digit) or invalid email
- 409-as-202: an already-registered email returns the SAME `verification_sent` shape (no
  enumeration); internally no duplicate is created (FR-016)

## POST /auth/email/verify

Confirm email ownership. (FR-004a)

- Body: `{ "token": "string" }`
- 200: `{ "status": "verified" }`
- 401 `UNAUTHENTICATED`: invalid/expired token

## POST /auth/login (email/password)

Sign in with verified email + password. (FR-003, FR-006)

- Body: `{ "email", "password", "deviceDescriptor?" }`
- 200: same session payload as `otp/verify`
- 401 `UNAUTHENTICATED`: wrong credentials OR unverified email OR no such account — single
  uniform message (FR-016, FR-004a)
- 429 `RATE_LIMITED`: too many attempts

## POST /auth/recover

Begin account recovery via phone or email. (FR-009, SC-007)

- Body: `{ "identifier": "+92... | email" }`
- 200: `{ "status": "if_account_exists_instructions_sent" }` — ALWAYS this shape regardless of
  existence (no enumeration)

## POST /auth/recover/confirm

Complete recovery; revokes all existing sessions and issues a fresh one. (FR-009)

- Body: phone: `{ "phone", "code", "deviceDescriptor?" }` OR email:
  `{ "token", "newPassword", "deviceDescriptor?" }`
- 200: session payload (all prior sessions now `revoked`)
- 401 `UNAUTHENTICATED`: invalid OTP/token

## POST /me/email (authenticated)

Add an email + password to a phone-first account. (FR-004, FR-004a, FR-005)

- Auth: Bearer; Body: `{ "email", "password" }`
- 202: `{ "status": "verification_sent" }` — both methods authenticate the same account once
  verified
- 409 `CONFLICT`: email already linked to a different account (FR-005)
