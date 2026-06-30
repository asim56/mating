# Contract: Audit explorer & dashboards (authenticated + admin)

Paths under `/api/v1/admin`. Admin document access audited (FR-011). Dashboards exclude
private health and payment proof content (FR-009).

## GET /admin/audit-logs

Search immutable audit log. (FR-008, US5)

- Auth: `super_admin` (support_agent: read-only subset without sensitive `metadata` keys)
- Query:
  - `actorId?` — filter by actor uuid
  - `subjectType?` — e.g. `payment_intent`, `animal`, `breeding_request`
  - `subjectId?`
  - `action?` — exact or prefix (`payment.`, `verification.`)
  - `from?`, `to?` — ISO8601 time range
  - `cursor?`, `limit?` (default 50, max 100)
- 200:
  ```json
  {
    "data": [{
      "id": "uuid",
      "actorId": "uuid|null",
      "subjectType": "string",
      "subjectId": "uuid|null",
      "action": "payment.reconciled",
      "metadata": { "redacted": true, "reasonCode": "..." },
      "createdAt": "ISO8601"
    }],
    "meta": { "nextCursor": "..." }
  }
  ```
- Audit: `admin.audit_queried` with filter summary (no full result payload)
- PII policy: phone, email, proof paths masked in `metadata` (SC-005)

## GET /admin/audit-logs/:id

Single audit entry detail (admin only).

- 200: full entry with redaction rules applied
- 403: support_agent if entry action in sensitive set (`admin.document_accessed`, payment proof)

## GET /admin/dashboards/summary

Business operations dashboard. (FR-009, US5)

- Auth: `super_admin`
- Query: `regionCode?`, `period?=7d|30d|90d`
- 200:
  ```json
  {
    "period": "30d",
    "regionCode": "PK",
    "metrics": {
      "activeBreeders": 120,
      "activeOwners": 340,
      "searchToRequestConversion": 0.08,
      "requestCompletionRate": 0.65,
      "disputeRate": 0.04,
      "verificationThroughput": {
        "pending": 15,
        "approvedThisPeriod": 42,
        "rejectedThisPeriod": 3
      },
      "revenueSummary": {
        "confirmedPaymentsCount": 88,
        "totalConfirmedAmount": 450000.00,
        "currencyCode": "PKR"
      },
      "monetization": {
        "activeBoosts": 12,
        "activeSubscriptions": 5
      }
    },
    "generatedAt": "ISO8601"
  }
  ```
- No health document content, message bodies, or payment proof URLs in response
- Audit: `admin.dashboard_viewed`

## GET /admin/dashboards/funnel

Optional detailed funnel breakdown.

- Query: `regionCode?`, `period?`
- 200: `{ stages: [{ name, count, conversionFromPrevious }] }`

### Sensitive document access pattern

Any admin endpoint that mints signed URLs for evidence (verification checklist, payment
proof, health records) MUST:

1. Require appropriate admin/vet/inspector role
2. Emit `admin.document_accessed` with `subject_type`, `subject_id`, `document_path` hash only
3. Return short-lived URL (≤15 minutes)
