# Contract: Profile, preferences, consent & devices (authenticated)

All paths under `/api/v1`. Profile completion and `/me` routes require a valid Bearer access
token. The `JwtAuthGuard` rejects revoked sessions (SC-003). Errors use the stable
`{ code, message, details? }` body. Profile updates that change privileged fields emit audit
events where noted (FR-014).

## POST /auth/profile

Complete the marketplace profile after sign-up. Required before most downstream features.
(FR-020, US4 profile story)

- Auth: Bearer (account exists in Supabase Auth but profile may be incomplete)
- Body:

```json
{
  "displayName": "string",
  "regionCode": "PK | US",
  "locale": "en | ur",
  "primaryRole": "buyer | breeder | animal_owner",
  "phone?": "+92XXXXXXXXXX | +1XXXXXXXXXX"
}
```

- 201:

```json
{
  "id": "uuid",
  "displayName": "string",
  "region": {
    "code": "PK",
    "name": "Pakistan",
    "currencyCode": "PKR",
    "defaultLocale": "en"
  },
  "locale": "en",
  "primaryRole": "buyer",
  "roles": ["buyer"],
  "profileComplete": true,
  "phone": "+92...",
  "email": "user@example.com | null",
  "status": "active",
  "createdAt": "ISO-8601"
}
```

- 400 `VALIDATION_FAILED`: missing/invalid `displayName`, unknown/inactive `regionCode`,
  invalid `locale` for region (e.g. `ur` only valid for PK), invalid `primaryRole`, malformed
  optional phone
- 409 `CONFLICT`: profile already complete (use `PATCH /me` instead)
- 401 `UNAUTHENTICATED`

**Notes**:

- `primaryRole` must be one of the self-selectable roles (FR-012b); defaults to `buyer` if
  omitted.
- `phone` is optional for US-primary accounts; when provided for PK it MUST match
  `PK_PHONE_REGEX`; for US, `US_PHONE_REGEX`.
- Creates the `profiles` row, links `region_id`, and sets `profile_complete=true`.
- Suspended accounts (`account_status.suspended`) receive 403 `FORBIDDEN` on this route.

## GET /me

Return the current account, profile, roles, and effective permissions. (FR-020)

- Auth: Bearer
- 200:

```json
{
  "id": "uuid",
  "status": "active | suspended",
  "displayName": "string",
  "region": {
    "code": "PK | US",
    "name": "string",
    "currencyCode": "PKR | USD",
    "defaultLocale": "en",
    "locales": ["en", "ur"],
    "paymentMethods": ["easypaisa", "jazzcash", "bank_transfer"]
  },
  "locale": "en | ur",
  "primaryRole": "buyer | breeder | animal_owner",
  "roles": ["buyer"],
  "permissions": ["profile:read", "profile:write"],
  "profileComplete": true,
  "phone": "+92... | null",
  "email": "user@example.com | null",
  "emailVerified": true,
  "phoneVerified": true,
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601"
}
```

- 401 `UNAUTHENTICATED`
- 404 `NOT_FOUND`: authenticated account has no profile row yet → client should call
  `POST /auth/profile`

**Notes**:

- `region.paymentMethods` reflects public-safe metadata from region config (PK:
  easypaisa/jazzcash/bank_transfer stubs; US: stripe/bank_transfer stubs).
- `permissions` is a derived, stable string list for client UI gating; authoritative
  enforcement remains server-side RBAC.

## PATCH /me

Update own profile fields. (FR-020, US5 locale story)

- Auth: Bearer
- Body (all optional; at least one field required):

```json
{
  "displayName?": "string",
  "locale?": "en | ur",
  "phone?": "+92... | +1... | null"
}
```

- 200: same shape as `GET /me`
- 400 `VALIDATION_FAILED`: invalid locale for region, malformed phone, empty patch
- 401 `UNAUTHENTICATED`
- 403 `FORBIDDEN`: suspended account

**Notes**:

- `regionCode` and `primaryRole` are **not** user-patchable after completion; role changes
  go through admin (`POST /admin/users/:id/roles`). Region change is admin-only in M1.
- Locale change affects subsequent notification template locale (en/ur).
- Audited when `displayName` changes (`profile.updated`).

## GET /me/notification-preferences

List notification preferences per channel and category. (FR-021, US6)

- Auth: Bearer
- 200:

```json
{
  "preferences": [
    {
      "channel": "email | sms | push",
      "category": "transactional | marketing | breeding_updates | account_security",
      "enabled": true,
      "optional": true
    }
  ],
  "marketingOptIn": false
}
```

- 401 `UNAUTHENTICATED`

**Notes**:

- `transactional` and `account_security` categories are `optional: false` — users cannot
  disable legally required or safety-critical delivery.
- `marketingOptIn` is derived from the latest `consents` row for marketing types.

## PATCH /me/notification-preferences

Update one or more channel/category preferences. (FR-021)

- Auth: Bearer
- Body:

```json
{
  "preferences": [
    { "channel": "email", "category": "breeding_updates", "enabled": false }
  ]
}
```

- 200: same shape as `GET /me/notification-preferences`
- 400 `VALIDATION_FAILED`: attempt to disable non-optional category
- 401 `UNAUTHENTICATED`

## POST /me/consents

Record explicit marketing (or other) consent with version. (FR-021, US6)

- Auth: Bearer
- Body:

```json
{
  "consentType": "marketing_email | marketing_sms | marketing_push",
  "version": "2026-06-01",
  "granted": true
}
```

- 201:

```json
{
  "id": "uuid",
  "consentType": "marketing_email",
  "version": "2026-06-01",
  "granted": true,
  "createdAt": "ISO-8601"
}
```

- 400 `VALIDATION_FAILED`: unknown `consentType` or missing `version`
- 401 `UNAUTHENTICATED`

**Notes**:

- Grant and withdrawal both POST with `granted: true|false`; each creates an append-only
  consent row and emits `consent.granted` / `consent.withdrawn` audit events.
- Marketing notifications MUST be suppressed until `granted: true` for the relevant type.

## POST /devices

Register a push notification device token. (FR-024, notifications module)

- Auth: Bearer
- Body:

```json
{
  "pushToken": "string",
  "platform": "ios | android | web"
}
```

- 201: `{ "id": "uuid", "pushToken": "string", "platform": "ios", "createdAt": "ISO-8601" }`
- 400 `VALIDATION_FAILED`: missing token or platform
- 401 `UNAUTHENTICATED`
- 409 `CONFLICT`: token already registered to another account → previous registration is
  replaced (idempotent upsert semantics)

## DELETE /devices/:id

Remove a device token belonging to the current account.

- Auth: Bearer
- 200: `{ "deleted": true }`
- 401 `UNAUTHENTICATED`
- 404 `NOT_FOUND`: device not owned by caller

## Behavior notes

- Profile reads are owner-scoped; RLS prevents reading other users' profiles (defense in
  depth with API policies).
- PK users see `currencyCode: PKR` and may select `locale: ur` (RTL shell); US users see
  `USD` and `locale: en` by default (SC-008, SC-009).
- Field Onboarding Rep (scoped `support_agent`) profile-assist flows are deferred to M6;
  this contract covers self-service paths only.
