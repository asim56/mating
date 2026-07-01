# Contract: Regions & breed taxonomy (reference data + admin)

All paths under `/api/v1`. Public reference endpoints require no authentication. Admin
endpoints require Bearer token + `super_admin` role (FR-029, US8 scenario 3). Errors use the
stable `{ code, message, details? }` body. Admin mutations emit immutable audit events
(`region.updated`, `breed.created`, `breed.updated`) per FR-014.

## GET /regions

List active launch regions for sign-up and profile completion. (FR-018, SC-008)

- Auth: none (public)
- 200:

```json
{
  "data": [
    {
      "code": "PK",
      "name": "Pakistan",
      "currencyCode": "PKR",
      "defaultLocale": "en",
      "locales": ["en", "ur"],
      "paymentMethods": ["easypaisa", "jazzcash", "bank_transfer"]
    },
    {
      "code": "US",
      "name": "United States",
      "currencyCode": "USD",
      "defaultLocale": "en",
      "locales": ["en"],
      "paymentMethods": ["stripe", "bank_transfer"]
    }
  ]
}
```

- **Notes**:
  - Returns only `active=true` regions.
  - Omits internal `config` (eligibility/compliance jsonb) — public-safe slice only.
  - PK and US rows MUST exist after seed (dual geography scope lock).

## GET /breeds

List active breeds for animal registration and discovery filters. (FR-019)

- Auth: none (public)
- Query:
  - `regionCode?`: `PK | US` (recommended; defaults to all active regions if omitted)
  - `species?`: `cattle | buffalo | goat | sheep | dog`
- 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "regionCode": "PK",
      "species": "cattle",
      "name": "Sahiwal",
      "description": "Heat-tolerant dairy breed."
    }
  ]
}
```

- 400 `VALIDATION_FAILED`: unknown `regionCode` or `species`

**Notes**:

- M1 seeds priority PK breeds (cattle, buffalo, goat, sheep, dog). US breed seed MAY be
  empty at launch; admin can add via `POST /admin/breeds`.
- Results are not cursor-paginated at M1 scale (bounded seed set); revisit if taxonomy grows.

---

## Admin: regions

### GET /admin/regions

List all regions including inactive, with full configuration. (FR-029)

- Auth: Bearer + `super_admin`
- 200:

```json
{
  "data": [
    {
      "code": "PK",
      "name": "Pakistan",
      "currencyCode": "PKR",
      "defaultLocale": "en",
      "locales": ["en", "ur"],
      "active": true,
      "config": {
        "eligibility": {
          "species": { "cattle": { "minAgeMonths": 18, "requiresHealthCheck": true, "requiresVaccination": true } },
          "defaults": { "minAgeMonths": 12, "requiresHealthCheck": true, "requiresVaccination": false }
        },
        "compliance": {
          "subdivisions": ["punjab", "sindh", "kpk", "balochistan", "ict"],
          "exoticRequiresApproval": true,
          "kycRequiredForPayments": true
        },
        "paymentMethods": ["easypaisa", "jazzcash", "bank_transfer"]
      }
    }
  ]
}
```

- 403 `FORBIDDEN`: non-admin

### GET /admin/regions/:code

Get a single region by code (`PK` | `US`) with full config.

- Auth: Bearer + `super_admin`
- 200: single region object (same shape as list item)
- 403 `FORBIDDEN`
- 404 `NOT_FOUND`: unknown code

### PATCH /admin/regions/:code

Update mutable region fields. (FR-029, US8 scenario 3)

- Auth: Bearer + `super_admin`
- Body (all optional; at least one field):

```json
{
  "name?": "string",
  "defaultLocale?": "en | ur",
  "locales?": ["en", "ur"],
  "active?": true,
  "config?": {
    "eligibility?": { "species?": {}, "defaults?": {} },
    "compliance?": {},
    "paymentMethods?": ["easypaisa", "jazzcash", "bank_transfer"]
  }
}
```

- 200: updated region object (full admin shape)
- 400 `VALIDATION_FAILED`: invalid locale list, empty patch
- 403 `FORBIDDEN`
- 404 `NOT_FOUND`

**Notes**:

- `code` and `currencyCode` are **immutable** after seed.
- `config` is shallow-merged over the existing jsonb document.
- Change audited as `region.updated` with actor, region code, and changed keys in context.

---

## Admin: breeds

### GET /admin/breeds

List all breeds including inactive.

- Auth: Bearer + `super_admin`
- 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "regionCode": "PK",
      "species": "cattle",
      "name": "Sahiwal",
      "description": "Heat-tolerant dairy breed.",
      "active": true
    }
  ]
}
```

- 403 `FORBIDDEN`

### GET /admin/breeds/:id

Get a single breed by id.

- Auth: Bearer + `super_admin`
- 200: single breed object (admin shape)
- 403 `FORBIDDEN`
- 404 `NOT_FOUND`

### POST /admin/breeds

Create a breed taxonomy entry. (FR-019)

- Auth: Bearer + `super_admin`
- Body:

```json
{
  "regionCode": "PK | US",
  "species": "cattle | buffalo | goat | sheep | dog",
  "name": "string",
  "description?": "string",
  "active?": true
}
```

- 201: breed object (admin shape)
- 400 `VALIDATION_FAILED`: invalid species/region/name
- 403 `FORBIDDEN`
- 409 `CONFLICT`: duplicate `(regionCode, species, name)` triple

**Notes**: audited as `breed.created`.

### PATCH /admin/breeds/:id

Update breed fields (`name`, `description`, `active`).

- Auth: Bearer + `super_admin`
- Body:

```json
{
  "name?": "string",
  "description?": "string | null",
  "active?": true
}
```

- 200: updated breed object
- 403 `FORBIDDEN`
- 404 `NOT_FOUND`
- 409 `CONFLICT`: rename collides with existing triple

**Notes**: audited as `breed.updated`. `regionCode` and `species` are immutable after
create.

## Seed requirements (deployment)

| Region | `code` | `currencyCode` | `locales` | `paymentMethods` (stubs) |
| --- | --- | --- | --- | --- |
| Pakistan | `PK` | `PKR` | `en`, `ur` | `easypaisa`, `jazzcash`, `bank_transfer` |
| United States | `US` | `USD` | `en` | `stripe`, `bank_transfer` |

PK breed seed (minimum): at least one breed per priority species
(`cattle`, `buffalo`, `goat`, `sheep`, `dog`) linked to `regionCode=PK`.

## Behavior notes

- Public region/breed data is read-only; all writes go through admin routes with service-role
  DB access behind the API.
- Eligibility config in `regions.config.eligibility` is consumed by M2/M4 modules; M1 only
  seeds and serves it — no enforcement endpoints in this feature.
- Typed config accessor in `@mating/shared` (`REGION_DEFINITIONS`) MUST stay aligned with
  seeded `regions.config` to prevent layer drift.
