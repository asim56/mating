-- M5 verification: verification_requests queue surface.

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('animal', 'profile', 'facility')),
  subject_id uuid not null,
  dimension text not null,
  requester_id uuid not null references auth.users (id) on delete restrict,
  reviewer_id uuid references auth.users (id) on delete set null,
  status text not null default 'pending',
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_requests_requester_idx
  on public.verification_requests (requester_id, created_at desc);
create index if not exists verification_requests_status_idx
  on public.verification_requests (status, created_at desc);

create unique index if not exists verification_requests_pending_unique
  on public.verification_requests (subject_type, subject_id, dimension)
  where status = 'pending';

drop trigger if exists set_verification_requests_updated_at on public.verification_requests;
create trigger set_verification_requests_updated_at
  before update on public.verification_requests
  for each row execute function public.set_updated_at();

alter table public.verification_requests enable row level security;

drop policy if exists verification_requests_requester_read on public.verification_requests;
create policy verification_requests_requester_read on public.verification_requests
  for select using (requester_id = auth.uid());

drop policy if exists verification_requests_requester_insert on public.verification_requests;
create policy verification_requests_requester_insert on public.verification_requests
  for insert with check (requester_id = auth.uid());
