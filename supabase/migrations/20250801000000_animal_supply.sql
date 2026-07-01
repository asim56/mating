-- M2 animal supply: animals, media, health records, pedigree, storage buckets.

create table if not exists public.animals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  region_id uuid not null references public.regions (id) on delete restrict,
  species text not null,
  breed_id uuid references public.breeds (id) on delete set null,
  name text,
  tag_number text,
  sex text not null,
  date_of_birth date,
  approximate_age_months integer,
  weight_kg numeric(10, 2),
  color text,
  description text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  city text,
  province_or_state text,
  country_code text,
  breeding_status text not null default 'draft'
    check (breeding_status in ('draft', 'publish_ready', 'listed', 'not_listed')),
  health_status text not null default 'unknown'
    check (health_status in ('unknown', 'healthy', 'attention', 'blocked')),
  owner_declaration boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists animals_owner_id_idx on public.animals (owner_id);
create index if not exists animals_breeding_status_idx on public.animals (breeding_status);
create index if not exists animals_deleted_at_idx on public.animals (deleted_at);

drop trigger if exists set_animals_updated_at on public.animals;
create trigger set_animals_updated_at
  before update on public.animals
  for each row execute function public.set_updated_at();

create table if not exists public.animal_media (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'document')),
  visibility text not null default 'private',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists animal_media_animal_id_idx on public.animal_media (animal_id);

create table if not exists public.health_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  veterinarian_id uuid references auth.users (id) on delete set null,
  record_type text not null,
  title text not null,
  record_date date not null,
  expires_at date,
  status text not null default 'submitted',
  storage_path text,
  created_by uuid not null references auth.users (id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists health_records_animal_id_idx on public.health_records (animal_id);

drop trigger if exists set_health_records_updated_at on public.health_records;
create trigger set_health_records_updated_at
  before update on public.health_records
  for each row execute function public.set_updated_at();

create table if not exists public.pedigree_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals (id) on delete cascade,
  sire_animal_id uuid references public.animals (id) on delete set null,
  dam_animal_id uuid references public.animals (id) on delete set null,
  registry_name text,
  registry_number text,
  document_path text,
  verification_status text not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pedigree_records_animal_id_idx on public.pedigree_records (animal_id);

-- RLS: owner CRUD on own animals; service role bypasses for admin API.
alter table public.animals enable row level security;
alter table public.animal_media enable row level security;
alter table public.health_records enable row level security;
alter table public.pedigree_records enable row level security;

drop policy if exists animals_owner_select on public.animals;
create policy animals_owner_select on public.animals
  for select using (owner_id = auth.uid() and deleted_at is null);

drop policy if exists animals_owner_write on public.animals;
create policy animals_owner_write on public.animals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists animal_media_owner on public.animal_media;
create policy animal_media_owner on public.animal_media
  for all using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.owner_id = auth.uid()
    )
  );

drop policy if exists health_records_owner_vet_read on public.health_records;
create policy health_records_owner_vet_read on public.health_records
  for select using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.owner_id = auth.uid()
    )
    or veterinarian_id = auth.uid()
    or created_by = auth.uid()
  );

drop policy if exists health_records_owner_vet_write on public.health_records;
create policy health_records_owner_vet_write on public.health_records
  for insert with check (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.user_roles ur
      where ur.account_id = auth.uid() and ur.role = 'veterinarian'
    )
  );

drop policy if exists pedigree_records_owner on public.pedigree_records;
create policy pedigree_records_owner on public.pedigree_records
  for all using (
    exists (
      select 1 from public.animals a
      where a.id = animal_id and a.owner_id = auth.uid()
    )
  );

-- Storage buckets (private; signed URLs only).
insert into storage.buckets (id, name, public)
values
  ('animal-media', 'animal-media', false),
  ('health-records', 'health-records', false),
  ('pedigree-documents', 'pedigree-documents', false)
on conflict (id) do nothing;

drop policy if exists animal_media_owner_upload on storage.objects;
create policy animal_media_owner_upload on storage.objects
  for insert with check (
    bucket_id = 'animal-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists animal_media_owner_read on storage.objects;
create policy animal_media_owner_read on storage.objects
  for select using (
    bucket_id = 'animal-media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists health_records_owner_upload on storage.objects;
create policy health_records_owner_upload on storage.objects
  for insert with check (
    bucket_id = 'health-records'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists health_records_owner_read on storage.objects;
create policy health_records_owner_read on storage.objects
  for select using (
    bucket_id = 'health-records'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists pedigree_docs_owner_upload on storage.objects;
create policy pedigree_docs_owner_upload on storage.objects
  for insert with check (
    bucket_id = 'pedigree-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists pedigree_docs_owner_read on storage.objects;
create policy pedigree_docs_owner_read on storage.objects
  for select using (
    bucket_id = 'pedigree-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
