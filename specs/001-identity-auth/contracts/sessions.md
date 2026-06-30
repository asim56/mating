# Contract: Session & device endpoints (authenticated)

All paths under `/api/v1`; require a valid Bearer access token. The `JwtAuthGuard` rejects
requests whose `session_id` is missing or `revoked` (SC-003). Errors use the stable
`{ code, message, details? }` body.

## GET /me/sessions

List the current account's active sessions/devices. (FR-007)

- Auth: Bearer
- Query: `cursor?`, `limit?` (cursor pagination, default 20 / max 100)
- 200: `{ "data": [ { "id", "deviceDescriptor", "ip", "lastSeenAt", "createdAt",
  "current": boolean } ], "meta": { "nextCursor", "hasMore" } }`
- 401 `UNAUTHENTICATED`

## POST /me/sessions/revoke

Revoke a specific session or all sessions of the current account. (FR-008)

- Auth: Bearer
- Body: `{ "sessionId": "uuid" }` (revoke one) OR `{ "all": true }` (revoke all)
- 200: `{ "revoked": <count> }` — revoked sessions cannot perform any authenticated action
  within 1 minute (sets `status='revoked'` + Supabase sign-out)
- 404 `NOT_FOUND`: sessionId not owned by the caller
- 401 `UNAUTHENTICATED`

## POST /auth/logout

Revoke the current session. (FR-006, FR-008)

- Auth: Bearer
- 200: `{ "status": "logged_out" }` — current session set `revoked`
- 401 `UNAUTHENTICATED`

## Behavior notes

- A revoked or expired token on any authenticated route → 401 `UNAUTHENTICATED`
  (treated as unauthenticated; spec edge case).
- Revoking the current session is allowed and ends it.
