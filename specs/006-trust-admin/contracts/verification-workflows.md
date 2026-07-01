# Contract: Verification approve/reject (authenticated + role-scoped)

Paths under `/api/v1/admin`. Requires Bearer + role per dimension matrix (FR-001).

## POST /admin/verifications/:id/approve

Approve a pending verification request. (FR-001, FR-002, US1)

- Auth:
  - `veterinarian`: only `health`, `vaccination` dimensions
  - `inspector`: only `media`, `facility`, `pedigree` dimensions
  - `super_admin`: all dimensions including `owner_identity`
- Body: `{ "notes?": "string" }`
- 200:
  ```json
  {
    "id": "uuid",
    "status": "approved",
    "dimension": "health",
    "subjectType": "animal",
    "subjectId": "uuid",
    "decidedAt": "ISO8601"
  }
  ```
- 403 `FORBIDDEN`: inspector attempting health approval (US1 scenario 2)
- 400: not `pending` or already decided
- Side effects: subject `verification_dimensions[dimension] = approved`; audit
  `verification.approved`; analytics `verification_approved` with dimension label (not generic
  "verified")

## POST /admin/verifications/:id/reject

Reject with reason. (US1 scenario 3)

- Same auth matrix as approve
- Body: `{ "notes": "required reason for owner" }`
- 200: `{ id, status: "rejected", dimension, ... }`
- Side effects: dimension → `rejected`; audit `verification.rejected`

## GET /admin/verifications/:id

Detail for review (includes checklist evidence refs, signed URLs for media).

- Auth: admin, support (read), vet/inspector (if dimension in their scope)
- 200: full request + `subjectSummary` + `evidenceUrls?` (short-lived)
- Audit: `admin.document_accessed` when evidence URLs issued (FR-011)

### Display contract (downstream)

Public animal/profile surfaces MUST show per-dimension labels, e.g. `"health: approved"` —
never aggregate `{ verified: true }` (Constitution I).
