# Contract: Verification requests — queue surface (M5)

M5 submits and lists pending items only; approve/reject in [006-trust-admin](../006-trust-admin/contracts/verification-workflows.md).

Paths under `/api/v1`. Bearer required.

## POST /verifications

Submit verification request by dimension. (FR-011, US6)

- Body:
  ```json
  {
    "subjectType": "animal|profile|facility",
    "subjectId": "uuid",
    "dimension": "media|health|vaccination|pedigree|facility|owner_identity",
    "checklist?": { "mediaIds": [], "notes": "..." }
  }
  ```
- 201: `{ id, status: "pending", dimension, subjectType, subjectId, createdAt }`
- 400: invalid dimension for subject; duplicate pending request for same dimension
- 403: non-owner of subject
- Audit: `verification.request_submitted`

## GET /verifications/me

List caller's verification requests.

- Query: `cursor?`, `status?`, `dimension?`
- 200: paginated list

## GET /admin/verifications

Admin pending queue. (FR-011)

- Auth: Bearer + `super_admin` | `support_agent` (read-only queue)
- Query: `status?=pending` (default), `dimension?`, `subjectType?`, `cursor?`, `limit?`
- 200:
  ```json
  {
    "data": [{
      "id", "dimension", "subjectType", "subjectId",
      "requesterId", "status", "createdAt",
      "subjectSummary": { "name": "...", "species?": "..." }
    }],
    "meta": { "nextCursor": "..." }
  }
  ```
- 403: non-admin/support

**M6 adds**: `POST /admin/verifications/:id/approve` and `reject` with vet/inspector RBAC.
