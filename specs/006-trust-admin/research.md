# Phase 0 Research: Trust & Admin

Resolves RBAC scoping, dispute resolution integration, reputation weighting, and admin
observability for M6. Each item: Decision / Rationale / Alternatives considered.

## 1. Verification dimension RBAC (FR-001)

- **Decision**: Approval/rejection authorized by role × dimension matrix:
  - `veterinarian`: `health`, `vaccination` only
  - `inspector`: `media`, `facility`, `pedigree` (evidence dimensions) only
  - `super_admin`: all dimensions including `owner_identity`
  - `support_agent`: read queue only — no approve/reject
- **Rationale**: Spec US1 scenarios 1–2; Constitution I explicit labels per dimension.
- **Alternatives considered**: Admin-only verification (rejected: spec requires vet/inspector
  paths); single `verified` boolean (rejected: constitution).

## 2. Verification decision application

- **Decision**: On approve/reject, update `verification_requests.status` and mirror to subject:
  - `animal` → `animals.metadata.verification_dimensions[dimension] = approved|rejected`
  - `profile` → `profiles.metadata.verification_dimensions` (owner_identity)
  Emit `verification_approved` or `verification_rejected` audit + analytics event.
- **Rationale**: M2 passive badges become active; display layer shows dimension-specific label.
- **Alternatives considered**: Separate `verification_decisions` table (acceptable future; YAGNI
  — request row + audit sufficient for MVP).

## 3. Dispute workflow (FR-003, FR-004)

- **Decision**: Extend M4 `disputes` table. States: `open` → `assigned` → `investigating` →
  `resolved` | `closed`. Support `POST /admin/disputes/:id/assign` sets `assigned_to` self or
  peer. Resolve requires `resolution_code` + `resolution_type` enum
  (`refund_full` | `refund_partial` | `no_refund_close` | `cancel_request`). Refund types call
  M5 `POST /admin/payments/:id/refund` with linked `payment_intent_id` and dispute reason
  code.
- **Rationale**: Closes M4 open-only disputes; breeding request moves to `Refunded` or `Closed`
  per resolution (SC-002).
- **Alternatives considered**: Dispute module separate from breeding-requests (rejected:
  tight coupling to request state).

## 4. Review eligibility and uniqueness (FR-005)

- **Decision**: `POST /reviews` allowed when breeding request in `Completed` | `Closed` |
  `RecordGenerated` and within `REVIEW_WINDOW_DAYS` (default 30) of completion. Unique
  `(request_id, reviewer_id)`. Edits allowed within `REVIEW_EDIT_WINDOW_HOURS` (default 48)
  via `PATCH /reviews/:id` by reviewer only.
- **Rationale**: US3; prevents duplicate reviews (SC-003).
- **Alternatives considered**: Unlimited edit window (rejected: moderation abuse).

## 5. Review moderation and dispute flags (FR-006)

- **Decision**: `reviews.status`: `pending` | `published` | `hidden` | `flagged`. Dispute-open
  reviews auto-set `is_dispute_influenced=true` and `flagged` until support clears.
  `POST /admin/reviews/:id/moderate` `{ action: "approve"|"hide" }`. Hidden reviews excluded
  from `ReputationService` public aggregate.
- **Rationale**: Features.md — disputed transactions don't publish negative reputation until
  support review.
- **Alternatives considered**: Delete reviews (rejected: audit needs soft hide).

## 6. Reputation algorithm (spec Assumptions)

- **Decision**: `ReputationSummary` computed on read (cached optional later):
  ```
  score = (verificationWeight * verifiedDimensionCount)
        + (completionWeight * completedRequestCount)
        + (starWeight * avgPublishedRating)
  ```
  Weights in `@mating/shared/constants/reputation-weights.ts`: verification 0.5, completion
  0.3, stars 0.2. Hidden/flagged reviews excluded; suspended users' hidden reviews excluded.
- **Rationale**: Features.md weights verification + completion over raw stars.
- **Alternatives considered**: Stars-only average (rejected: spec); ML scoring (rejected: YAGNI).

## 7. Content moderation (FR-007)

- **Decision**: `POST /admin/listings/:id/suspend` and `POST /admin/animals/:id/suspend` with
  `reason_code` (`fraud` | `cruelty` | `disease_risk` | `illegal` | `other`). Sets
  `listings.status=suspended` or `animals.health_status=blocked` + removes from search index
  (marketplace query filter). Exotic listings in PK require `metadata.category_approved=true`
  from admin before publish — enforced at M3 with M6 override endpoint.
- **Rationale**: US4 welfare/fraud response; immediate discovery removal (SC-004).
- **Alternatives considered**: Delayed suspension job (rejected: SC-004 one-minute requirement).

## 8. Audit explorer (FR-008, FR-011)

- **Decision**: `GET /admin/audit-logs` queries M1 `audit_logs` with filters:
  `actorId`, `subjectType`, `subjectId`, `action` (prefix match), `from`, `to`, cursor
  pagination. Response redacts raw PII from `metadata` per policy (phone/email masked). Admin
  viewing verification evidence or payment proof paths triggers `admin.document_accessed`.
- **Rationale**: Constitution I + SC-005 security review sampling.
- **Alternatives considered**: Elasticsearch (rejected: YAGNI); export to CSV (deferred M7).

## 9. Business dashboards (FR-009)

- **Decision**: `GET /admin/dashboards/summary` aggregates from `analytics_events` +
  SQL rollups: active breeders, search-to-request conversion, completion rate, dispute rate,
  verification throughput (pending vs resolved/week), boost/subscription conversion. No raw
  health docs or payment proof in response.
- **Rationale**: US5 operational observability without PII leakage.
- **Alternatives considered**: Third-party BI only (rejected: launch needs in-app summary).

## 10. Field Onboarding Rep scope (FR-010)

- **Decision**: `field_onboarding_rep` role (variant of support) may:
  `GET /admin/users` (limited), `PATCH` profile assistance fields, view animal drafts — all
  attributed in audit `context.rep_id`. Explicit 403 on `/admin/payments/*`, `/admin/payouts/*`,
  `/admin/disputes/*` resolve, payout approve.
- **Rationale**: Spec edge cases; ImplementationPlan Field Rep RBAC note.
- **Alternatives considered**: Full support parity (rejected: spec forbids payment/dispute access).

## Open items deferred (not blocking)

- Final audit/review retention periods → M7 launch hardening.
- Automated AI content moderation → out of scope.
- Native mobile admin apps → out of scope.
