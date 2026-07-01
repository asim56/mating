-- M6 verification decision workflow columns.

alter table public.verification_requests
  add column if not exists decided_by uuid references auth.users (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_notes text;

create index if not exists verification_requests_decided_idx
  on public.verification_requests (decided_at desc)
  where decided_at is not null;
