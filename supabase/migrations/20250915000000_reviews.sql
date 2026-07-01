-- M6 reviews: post-completion reviews with moderation.

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.breeding_requests (id) on delete restrict,
  reviewer_id uuid not null references auth.users (id) on delete restrict,
  subject_user_id uuid not null references auth.users (id) on delete restrict,
  subject_animal_id uuid references public.animals (id) on delete set null,
  rating smallint not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  status text not null default 'published',
  is_dispute_influenced boolean not null default false,
  moderated_by uuid references auth.users (id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists reviews_request_reviewer_unique
  on public.reviews (request_id, reviewer_id)
  where deleted_at is null;

create index if not exists reviews_subject_user_idx
  on public.reviews (subject_user_id, created_at desc)
  where deleted_at is null;

create index if not exists reviews_status_idx
  on public.reviews (status, created_at desc)
  where deleted_at is null;

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

drop policy if exists reviews_published_read on public.reviews;
create policy reviews_published_read on public.reviews
  for select using (status = 'published' and deleted_at is null);

drop policy if exists reviews_reviewer_own on public.reviews;
create policy reviews_reviewer_own on public.reviews
  for all using (reviewer_id = auth.uid());
