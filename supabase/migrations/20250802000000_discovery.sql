-- M3 discovery: listings, saved_listings, search_vector trigger, RLS.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete restrict,
  owner_id uuid not null references auth.users (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete restrict,
  listing_type text not null,
  status text not null default 'draft',
  title text not null,
  description text,
  breeding_method text not null,
  price_amount numeric(12, 2),
  currency_code text not null,
  availability jsonb not null default '{}'::jsonb,
  location_radius_km numeric(6, 2),
  search_vector tsvector,
  boost_active boolean not null default false,
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists listings_animal_id_idx on public.listings (animal_id);
create index if not exists listings_owner_status_idx on public.listings (owner_id, status);
create index if not exists listings_region_species_idx
  on public.listings (region_id, status)
  where deleted_at is null;
create index if not exists listings_search_idx on public.listings using gin (search_vector);

drop trigger if exists set_listings_updated_at on public.listings;
create trigger set_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create or replace function public.listings_search_vector_update()
returns trigger
language plpgsql
as $$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.description, '')), 'B');
  return new;
end;
$$;

drop trigger if exists listings_search_vector_trg on public.listings;
create trigger listings_search_vector_trg
  before insert or update of title, description on public.listings
  for each row execute function public.listings_search_vector_update();

create table if not exists public.saved_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table public.listings enable row level security;
alter table public.saved_listings enable row level security;

drop policy if exists listings_public_read_active on public.listings;
create policy listings_public_read_active on public.listings
  for select using (status = 'active' and deleted_at is null);

drop policy if exists listings_owner_all on public.listings;
create policy listings_owner_all on public.listings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists saved_listings_own on public.saved_listings;
create policy saved_listings_own on public.saved_listings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
