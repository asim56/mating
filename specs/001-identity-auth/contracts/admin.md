# Contract: Administrative account control (authenticated + admin role)

All paths under `/api/v1`. Require a valid Bearer token AND an administrative role
(`super_admin`; `support_agent` where noted). Non-admins receive 403 `FORBIDDEN` (FR-012,
US4 scenario 4). Every action emits an immutable audit event (FR-014, SC-004). Errors use the
stable `{ code, message, details? }` body.

## GET /admin/users

Search/list accounts with status and roles. (US4 support)

- Auth: Bearer + admin
- Query: `q?` (phone/email/id fragment), `status?`, `cursor?`, `limit?`
- 200: cursor-paginated `{ data: [ { id, status, roles, createdAt } ], meta }`
- 403 `FORBIDDEN`: non-admin

## PATCH /admin/users/:id/status

Suspend or reactivate an account. (FR-011, US4 scenarios 2–3)

- Auth: Bearer + admin
- Body: `{ "status": "suspended" | "active", "reason?": "string" }`
- 200: `{ "id", "status", "reason" }` — suspended accounts are blocked from protected actions
  (enforced at authorization time); change is audited (`account.suspended` /
  `account.reactivated`)
- 403 `FORBIDDEN`: non-admin
- 404 `NOT_FOUND`: unknown account

## POST /admin/users/:id/revoke-sessions

Force-logout: revoke ALL of the target user's sessions. (FR-010, US4 scenario 1)

- Auth: Bearer + admin
- 200: `{ "revoked": <count> }` — all target sessions end within 1 minute (SC-003);
  audited (`session.revoked`, subject = target)
- 403 `FORBIDDEN` / 404 `NOT_FOUND`

## POST /admin/users/:id/roles

Grant a role (including sensitive roles). (FR-012b, FR-014)

- Auth: Bearer + admin
- Body: `{ "role": "<USER_ROLES value>" }`
- 200: `{ "id", "roles" }` — assignment of `super_admin|support_agent|veterinarian|inspector`
  is admin-only; audited (`role.granted`)
- 403 `FORBIDDEN`: non-admin (or insufficient admin tier for granting `super_admin`)

## DELETE /admin/users/:id/roles/:role

Revoke a role. (FR-014)

- Auth: Bearer + admin
- 200: `{ "id", "roles" }` — audited (`role.revoked`)
- 403 `FORBIDDEN` / 404 `NOT_FOUND`

## Bootstrap (no endpoint — out-of-band)

The initial `super_admin` is granted by a seed/bootstrap step keyed on
`ADMIN_BOOTSTRAP_IDENTIFIER`, run with the service role at deployment. There is NO public,
self-service path to obtain admin privileges (FR-012a). The bootstrap grant emits an audit
event with a null/system actor.
