# Feature Specification: Animal Supply

**Feature Branch**: `002-animal-supply`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Animal supply: CRUD animals with media, health records, pedigree, breeder profiles,
listing drafts, default unverified badges (M2)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [001-identity-auth](../001-identity-auth/spec.md)

## Scope

### In scope

- Animal profile create, read, update, soft-delete (draft and publish-ready states).
- Media gallery with private storage and signed upload/read URLs.
- Clinical health records (vaccination, deworming, disease, fertility, pregnancy, certificates,
  contraindications) with vet linkage where applicable.
- Pedigree and lineage records (sire/dam links, registry, DNA documents, manual ancestry).
- Passive per-dimension verification badges (default `unverified`; never bare "verified").
- Region eligibility enforcement before an animal is publish-ready.
- Audit events for animal publish/unpublish and sensitive record changes.

### Out of scope

- Public marketplace listings and search (M3).
- Active vet/inspector verification approval workflows (M6; badges display only here).
- Breeding requests and messaging (M4).
- Payments (M5).

## User Scenarios & Testing *(mandatory)*

This feature lets breeders and animal owners register animals, attach evidence (photos,
health documents, pedigree), and prepare them for listing — the supply side of the
marketplace.

### User Story 1 - Register an animal draft (Priority: P1)

A signed-in breeder or owner creates a draft animal profile with species, breed, sex,
location, and at least basic identifying information, saving progress before all fields are
complete.

**Why this priority**: Without animal records there is no marketplace supply; drafts lower
friction for field-assisted and low-literacy onboarding.

**Independent Test**: Create a draft animal, leave and return, confirm partial data persisted
and the animal is not publicly visible.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they submit minimum draft fields, **Then** an animal
   record is created in draft state visible only to them.
2. **Given** a draft animal, **When** the owner updates fields, **Then** changes persist and
   an audit event records the update.
3. **Given** a non-owner, **When** they attempt to edit the animal, **Then** the action is
   refused.

---

### User Story 2 - Publish-ready animal with media (Priority: P1)

An owner completes required eligibility fields, uploads at least one image via a secure upload
flow, and marks the animal publish-ready (still not a public listing until M3).

**Why this priority**: Eligibility and media are trust prerequisites for any breeding listing.

**Independent Test**: Complete all required fields, upload an image, confirm publish-readiness
is granted and blocked when requirements are missing.

**Acceptance Scenarios**:

1. **Given** a draft missing required images, **When** the owner attempts publish-ready,
   **Then** validation fails with clear missing-field reasons.
2. **Given** a complete profile with ≥1 image and species/region minimum-age met, **When** the
   owner marks publish-ready, **Then** the animal becomes eligible for listing creation in M3.
3. **Given** uploaded media, **When** a non-owner requests it, **Then** access requires a
   signed, time-limited URL.

---

### User Story 3 - Health and pedigree records (Priority: P2)

An owner (or linked veterinarian for health-only actions) adds vaccination history, health
checks, and pedigree lineage documents to an owned animal.

**Why this priority**: Health and pedigree evidence drive trust and downstream matching scores.

**Independent Test**: Add a vaccination record and a pedigree entry with a document; confirm
records are private by default and visible to owner/vet/admin only.

**Acceptance Scenarios**:

1. **Given** an owned animal, **When** the owner adds a health record with document, **Then**
   the record is stored and retrievable by the owner with signed document access.
2. **Given** a veterinarian role, **When** they add a health readiness note for an animal they
   are authorized to verify, **Then** the record is attributed to the vet.
3. **Given** pedigree with sire/dam references, **When** lineage is saved, **Then** manual
   offline ancestry and registry numbers are stored with default `unverified` pedigree status.

---

### User Story 4 - Verification badges on profiles (Priority: P2)

A visitor viewing an animal they are permitted to see sees explicit per-dimension verification
status (e.g., media unverified, vaccination unverified) — never a generic "verified" label.

**Why this priority**: Constitution requires additive, explicit verification labeling from day
one.

**Independent Test**: View an animal profile and confirm each verification dimension shows its
own status, all defaulting to unverified for new animals.

**Acceptance Scenarios**:

1. **Given** a newly created animal, **When** displayed, **Then** each verification dimension
   shows `unverified` (or equivalent) separately.
2. **Given** partial evidence uploaded, **When** displayed, **Then** the UI does not imply
   full verification without naming the approved dimension.

---

### User Story 5 - Soft delete and welfare block (Priority: P3)

An owner soft-deletes an animal they no longer offer; blocked health statuses prevent
publish-ready state.

**Why this priority**: Supports data hygiene and welfare guardrails without destroying audit
history.

**Independent Test**: Soft-delete an animal and confirm it disappears from owner active lists
but remains in audit trail; attempt publish-ready with blocked health status and confirm
rejection.

**Acceptance Scenarios**:

1. **Given** an owned animal, **When** the owner deletes it, **Then** it is soft-deleted and
   excluded from active views.
2. **Given** an animal with a welfare-blocked health status, **When** publish-ready is
   attempted, **Then** it is refused.

### Edge Cases

- Publish-ready attempted under minimum age for species/region → rejected with eligibility detail.
- Media upload URL requested by non-owner → refused.
- Pedigree sire/dam self-reference or circular lineage → validation error.
- Concurrent edits to the same animal → last-write wins with audit trail for both attempts.
- Suspended owner → cannot create or publish-ready animals.
- Exotic species in PK region → flagged for admin approval before publish-ready (config-driven).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Signed-in owners MUST create, read, update, and soft-delete their own animals.
- **FR-002**: Animals MUST support draft and publish-ready states; publish-ready MUST enforce
  species, breed (or description), sex, location, owner declaration, ≥1 image, non-blocked
  health status, and species/region minimum-age rules.
- **FR-003**: The system MUST provide secure media upload and read via time-limited signed URLs;
  media MUST NOT be publicly enumerable.
- **FR-004**: Owners MUST add health records of supported types; records MUST be private by
  default with role-appropriate access for veterinarians and administrators.
- **FR-005**: Owners MUST add pedigree records including sire/dam links, registry metadata, and
  document references; default pedigree verification MUST be `unverified`.
- **FR-006**: Animal profiles MUST expose per-dimension verification status; the system MUST NOT
  display undifferentiated "verified" without naming the dimension.
- **FR-007**: Animal publish and unpublish (publish-ready transitions) MUST emit audit events.
- **FR-008**: Health documents and pedigree documents MUST use private storage with signed URL
  access only.
- **FR-009**: Deleted animals MUST use soft delete and MUST be excluded from active supply views.
- **FR-010**: Region eligibility configuration from M1 MUST drive minimum-age and health rules at
  publish-ready time.
- **FR-011**: Only authorized roles (owner, veterinarian for health-only, administrator) MAY
  mutate records per the product RBAC matrix.

### Key Entities

- **Animal**: Owned breeding subject with species, breed, sex, age, location, health summary,
  draft/publish-ready state, soft-delete timestamp.
- **Animal Media**: Ordered gallery items (image/document) with storage reference and visibility.
- **Health Record**: Typed clinical entry (vaccination, fertility, etc.) with optional document
  and vet attribution.
- **Pedigree Record**: Lineage entry with sire/dam links, registry identifiers, documents, and
  verification status.
- **Verification Dimension Status**: Per-aspect trust label on an animal or profile (media,
  health, vaccination, pedigree, etc.).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can create a draft animal and reach publish-ready status in under 10
  minutes on a typical mobile connection (excluding large document upload time).
- **SC-002**: 100% of publish-ready attempts missing a required eligibility field are rejected
  with actionable validation feedback in testing.
- **SC-003**: 100% of non-owner direct media access attempts without a valid signed URL fail in
  security testing.
- **SC-004**: Every animal publish-ready and soft-delete action produces an audit record in
  automated tests.
- **SC-005**: New animals display all verification dimensions as unverified until M6 approval
  workflows update them.

## Assumptions

- M1 (identity, profiles, regions, breeds) is complete; owners have a region-bound profile.
- Priority species for PK seed breeds apply; US animals may use the same species taxonomy.
- Listing creation links to publish-ready animals in M3; this feature does not create listings.
- Veterinarian linkage uses role assignment from M1; full vet workflow queue ships in M6.
- Storage provider abstraction exists from monorepo foundation; implementation details belong in
  `/speckit-plan`.
