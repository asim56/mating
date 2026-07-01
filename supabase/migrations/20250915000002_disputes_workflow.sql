-- M6 dispute workflow extensions.

alter table public.disputes
  add column if not exists resolution_code text,
  add column if not exists resolved_by uuid references auth.users (id) on delete set null;

-- Expand status check: open → assigned → investigating → resolved
alter table public.disputes drop constraint if exists disputes_status_check;
alter table public.disputes
  add constraint disputes_status_check
  check (status in ('open', 'assigned', 'investigating', 'resolved'));

-- Replace open-only unique index with broader active dispute guard
drop index if exists disputes_open_request_idx;
create unique index if not exists disputes_active_request_idx
  on public.disputes (request_id)
  where status in ('open', 'assigned', 'investigating');

create index if not exists disputes_assigned_to_idx
  on public.disputes (assigned_to, status, created_at desc)
  where assigned_to is not null;
