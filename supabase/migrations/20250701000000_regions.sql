-- config/regions (M1, REGIONS-01/02): region, currency, locale, and the
-- eligibility + compliance configuration consumed by later region-scoped tables
-- (breeds, profiles, animals, listings, ...). Schema follows the canonical
-- `regions` table in doc/IntegrationGuide.md.

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  currency_code text not null,
  default_locale text not null,
  locales text[] not null default '{}',
  active boolean not null default true,
  -- Eligibility (min age/health by species) + compliance flags + payment
  -- methods. Shape mirrors RegionConfig in @mating/shared (config/eligibility).
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists regions_active_idx on public.regions (active);

-- Keep updated_at fresh via the shared trigger from the foundation migration.
drop trigger if exists set_regions_updated_at on public.regions;
create trigger set_regions_updated_at
  before update on public.regions
  for each row
  execute function public.set_updated_at();

-- RLS baseline (M1): active regions are public reference data; writes are
-- restricted to the server (service role bypasses RLS). Admin config writes go
-- through the API under RBAC, never directly from client roles.
alter table public.regions enable row level security;

drop policy if exists regions_read_active on public.regions;
create policy regions_read_active
  on public.regions
  for select
  using (active = true);

-- Down (reversibility):
--   drop table if exists public.regions cascade;
