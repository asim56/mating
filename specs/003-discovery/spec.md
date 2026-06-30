# Feature Specification: Discovery

**Feature Branch**: `003-discovery`

**Created**: 2026-06-30

**Status**: Draft

**Input**: Discovery: publish listings, PostgreSQL search/filters, listing detail, SEO
city/species pages, saved listings, discovery analytics (M3)

**Parent scope**: [000-product-scope](../000-product-scope/spec.md) · **Depends on**: [002-animal-supply](../002-animal-supply/spec.md)

## Scope

### In scope

- Breeding listings lifecycle (draft → active and other statuses per product contract).
- Publish validation tied to publish-ready animals and listing-type rules.
- Full-text search with filters (species, breed, sex, location/distance, fee, verification,
  availability, health evidence, pedigree, breeding method).
- Deterministic compatibility scoring for search ranking (weighted signals from product contract).
- Listing detail pages (localized, no phone numbers on public pages).
- SEO-oriented city/species browse pages (server-rendered).
- Saved listings for authenticated users.
- Discovery analytics events (`listing_viewed`, `search_performed`, `animal_published`, saves).

### Out of scope

- Breeding requests and messaging (M4).
- Boost purchase and paid promotion (M5).
- AI/ML recommendations (deferred post-MVP).
- Elasticsearch or non-PostgreSQL search engines.

## User Scenarios & Testing *(mandatory)*

This feature lets animal owners and breeders discover compatible breeding partners through
searchable, trustworthy listings.

### User Story 1 - Publish a breeding listing (Priority: P1)

A breeder with a publish-ready animal creates and publishes a listing with fee, availability,
breeding method, and location radius.

**Why this priority**: Published listings are the core discovery supply surface.

**Independent Test**: Create listing from publish-ready animal, publish, confirm it appears in
owner dashboard as active and in public search.

**Acceptance Scenarios**:

1. **Given** a publish-ready animal, **When** the owner publishes a complete listing, **Then**
   status becomes active and the listing is publicly searchable.
2. **Given** an incomplete listing, **When** publish is attempted, **Then** validation errors
   identify missing fields.
3. **Given** a published listing, **When** the owner pauses it, **Then** it is hidden from public
   search but retained for the owner.

---

### User Story 2 - Search and filter listings (Priority: P1)

An animal owner searches for compatible partners by species, breed, location, fee, and health
signals, receiving ranked results.

**Why this priority**: Discovery is the primary demand-side value after supply exists.

**Independent Test**: Run searches with multiple filters; confirm results respect filters and
deterministic ranking order is reproducible.

**Acceptance Scenarios**:

1. **Given** active listings exist, **When** a user searches by species and region, **Then**
   only matching active listings are returned with cursor pagination.
2. **Given** filter criteria, **When** applied together, **Then** results satisfy all filters.
3. **Given** identical inputs, **When** search is repeated, **Then** ranking order is
   deterministic (same score ordering and documented tie-break).

---

### User Story 3 - View listing detail safely (Priority: P1)

A visitor opens a listing detail page with animal evidence, verification dimensions, and
breeding terms, without seeing owner phone numbers.

**Why this priority**: Trustworthy detail pages convert search into breeding requests (M4).

**Independent Test**: Open a public listing detail page; confirm phone is absent, verification
labels are per-dimension, and page renders in English and Urdu layouts.

**Acceptance Scenarios**:

1. **Given** an active listing, **When** a visitor views detail, **Then** structured information
   is shown without exposing phone numbers.
2. **Given** Urdu locale, **When** the page renders, **Then** layout is RTL and copy uses
   translation keys.
3. **Given** a suspended or soft-deleted listing, **When** accessed by URL, **Then** visitors see
   an appropriate not-found or unavailable state.

---

### User Story 4 - Save listings (Priority: P2)

A signed-in user saves listings to revisit later from their dashboard.

**Why this priority**: Saves increase return visits and signal demand quality.

**Independent Test**: Save and unsave a listing; confirm idempotent behavior and dashboard list.

**Acceptance Scenarios**:

1. **Given** a signed-in user viewing an active listing, **When** they save it, **Then** it
   appears in saved listings.
2. **Given** a saved listing that becomes suspended, **When** the user views saved list, **Then**
   it is excluded or marked unavailable.
3. **Given** repeated save of the same listing, **When** performed, **Then** no duplicate saved
   entry is created.

---

### User Story 5 - SEO browse pages (Priority: P3)

A prospective breeder lands on a city/species browse page from search engines and discovers
active listings.

**Why this priority**: Organic discovery supports Pakistan-first growth and long-term demand.

**Independent Test**: Request a city/species page; confirm server-rendered content, metadata,
and listing links without authentication.

**Acceptance Scenarios**:

1. **Given** listings in a city/species combination, **When** the SEO page is requested, **Then**
   it renders listing summaries and structured metadata for crawlers.
2. **Given** no listings for a combination, **When** the page is requested, **Then** an empty
   state is shown with correct metadata.

### Edge Cases

- Search rate limit exceeded → throttled with retry indication.
- Listing publish on animal that lost publish-ready status → rejected.
- Public listing page must not leak private health document content.
- Expired listings automatically excluded from active search (status-driven).
- Cross-region search respects user's region context where policy requires.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Owners MUST create, update, pause, and unpublish their own listings linked to
  publish-ready animals.
- **FR-002**: Listing publish MUST validate listing-type requirements and animal eligibility.
- **FR-003**: Only `active` non-deleted listings MUST appear in public search and SEO pages.
- **FR-004**: The system MUST support full-text search with cursor pagination and filters for
  species, breed, sex, location/distance, fee range, verification level, availability, health
  evidence, pedigree presence, and breeding method.
- **FR-005**: Search ranking MUST use deterministic compatibility scoring with documented
  weights (breed 25, health 20, pedigree 15, distance 15, verification 10, outcomes 10,
  dispute risk 5).
- **FR-006**: Public listing detail MUST NOT expose phone numbers.
- **FR-007**: Authenticated users MUST save and unsave listings idempotently.
- **FR-008**: Listing publish/unpublish and save actions MUST emit audit or analytics events as
  defined in the product contract.
- **FR-009**: City/species SEO pages MUST be server-rendered with structured metadata and
  localized (en/ur) support.
- **FR-010**: Search and listing view actions MUST respect rate limits and emit
  `search_performed` / `listing_viewed` analytics without private health payloads.

### Key Entities

- **Listing**: Public breeding offer linked to an animal, with status, fee, availability,
  method, and promotion state.
- **Saved Listing**: User bookmark of a listing with timestamp.
- **Search Result**: Ranked listing summary with compatibility score and filter metadata.
- **SEO Browse Page**: Server-rendered index for a geographic and species context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find at least one relevant listing via search in under 30 seconds under
  seed data load.
- **SC-002**: 95% of search requests return paginated results in under 2 seconds perceived wait
  on typical mobile connections (seed-scale dataset).
- **SC-003**: 100% of public listing detail pages tested expose zero phone numbers.
- **SC-004**: Deterministic ranking tests pass with identical input producing identical order
  across repeated runs.
- **SC-005**: Save/unsave operations are idempotent in 100% of automated test cases.

## Assumptions

- Animals reach publish-ready state via M2 before listings can go active.
- Boost/featured promotion payment is handled in M5; listings support boost flags but purchase
  is not in this feature.
- Phone masking in messages is M4; public listings never show phone regardless.
- PostgreSQL full-text search is sufficient for MVP scale per constitution.
