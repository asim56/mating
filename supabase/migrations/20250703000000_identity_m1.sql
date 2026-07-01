-- M1 identity & profiles: account status, roles, sessions, profiles, consents,
-- notification preferences, audit, analytics, outbox, devices.

create table if not exists public.account_status (
  account_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  reason text,
  changed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_account_status_updated_at on public.account_status;
create trigger set_account_status_updated_at
  before update on public.account_status
  for each row execute function public.set_updated_at();

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  granted_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (account_id, role)
);

create table if not exists public.sessions (
  id uuid primary key,
  account_id uuid not null references auth.users (id) on delete cascade,
  device_descriptor text,
  ip inet,
  user_agent text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id)
);

create index if not exists sessions_account_id_idx on public.sessions (account_id);
create index if not exists sessions_status_idx on public.sessions (status);

create table if not exists public.profiles (
  account_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  region_id uuid references public.regions (id),
  locale text not null default 'en',
  primary_role text not null default 'buyer',
  profile_complete boolean not null default false,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  channel text not null,
  category text not null,
  enabled boolean not null default true,
  unique (account_id, channel, category)
);

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null,
  version text not null,
  granted boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  subject_id uuid references auth.users (id),
  action text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event text not null,
  account_id uuid references auth.users (id),
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.outbox_messages (
  id uuid primary key default gen_random_uuid(),
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users (id),
  channel text not null,
  template text not null,
  status text not null default 'queued',
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users (id) on delete cascade,
  push_token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (account_id, push_token)
);

-- RLS
alter table public.account_status enable row level security;
alter table public.user_roles enable row level security;
alter table public.sessions enable row level security;
alter table public.profiles enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.consents enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.outbox_messages enable row level security;
alter table public.devices enable row level security;

create policy account_status_read_own on public.account_status for select using (account_id = auth.uid());
create policy user_roles_read_own on public.user_roles for select using (account_id = auth.uid());
create policy sessions_read_own on public.sessions for select using (account_id = auth.uid());
create policy profiles_read_own on public.profiles for select using (account_id = auth.uid());
create policy profiles_write_own on public.profiles for update using (account_id = auth.uid());
create policy notification_preferences_own on public.notification_preferences for all using (account_id = auth.uid());
create policy consents_read_own on public.consents for select using (account_id = auth.uid());
create policy devices_own on public.devices for all using (account_id = auth.uid());

-- Audit immutability for application roles (service role bypasses)
revoke update, delete on public.audit_logs from authenticated, anon;

-- Down: drop tables in reverse dependency order
