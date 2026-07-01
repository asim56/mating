-- breeds (M1, BREEDS-01/02): species/breed taxonomy seeded per region. Breeds
-- are region-scoped reference data consumed by later modules (animals, listings,
-- matching). Depends on the `regions` table (20250701000000_regions.sql).

create table if not exists public.breeds (
  id uuid primary key default gen_random_uuid(),
  -- Region link; restrict deletes so a region with breeds cannot be removed.
  region_code text not null references public.regions (code) on update cascade on delete restrict,
  species text not null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A breed name is unique within a (species, region); enforces the BREEDS-01 AC.
  constraint breeds_species_name_region_unique unique (species, name, region_code)
);

create index if not exists breeds_region_species_idx
  on public.breeds (region_code, species);
create index if not exists breeds_active_idx on public.breeds (active);

-- Keep updated_at fresh via the shared trigger from the foundation migration.
drop trigger if exists set_breeds_updated_at on public.breeds;
create trigger set_breeds_updated_at
  before update on public.breeds
  for each row
  execute function public.set_updated_at();

-- RLS baseline (M1): active breeds are public reference data; writes are
-- restricted to the server (service role bypasses RLS). Admin taxonomy changes
-- go through the API under RBAC, never directly from client roles.
alter table public.breeds enable row level security;

drop policy if exists breeds_read_active on public.breeds;
create policy breeds_read_active
  on public.breeds
  for select
  using (active = true);

-- Down (reversibility):
--   drop table if exists public.breeds cascade;
