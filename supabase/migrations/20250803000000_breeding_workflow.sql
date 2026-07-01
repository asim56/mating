-- M4 breeding workflow: requests, events, records, disputes, messaging.

create table if not exists public.breeding_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete restrict,
  recipient_id uuid not null references auth.users (id) on delete restrict,
  requester_animal_id uuid not null references public.animals (id) on delete restrict,
  recipient_animal_id uuid not null references public.animals (id) on delete restrict,
  listing_id uuid references public.listings (id) on delete set null,
  status text not null default 'requested',
  breeding_method text not null,
  proposed_at timestamptz,
  scheduled_at timestamptz,
  completed_at timestamptz,
  location_type text,
  location_details jsonb not null default '{}'::jsonb,
  fee_amount numeric(12, 2),
  currency_code text not null default 'PKR',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists breeding_requests_requester_idx
  on public.breeding_requests (requester_id, created_at desc);
create index if not exists breeding_requests_recipient_idx
  on public.breeding_requests (recipient_id, created_at desc);
create index if not exists breeding_requests_listing_idx
  on public.breeding_requests (listing_id)
  where deleted_at is null;

drop trigger if exists set_breeding_requests_updated_at on public.breeding_requests;
create trigger set_breeding_requests_updated_at
  before update on public.breeding_requests
  for each row execute function public.set_updated_at();

create table if not exists public.breeding_request_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.breeding_requests (id) on delete restrict,
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists breeding_request_events_request_idx
  on public.breeding_request_events (request_id, created_at);

create table if not exists public.breeding_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.breeding_requests (id) on delete restrict,
  requester_animal_id uuid not null references public.animals (id) on delete restrict,
  recipient_animal_id uuid not null references public.animals (id) on delete restrict,
  breeding_method text not null,
  breeding_date date not null,
  outcome_status text not null default 'pending_follow_up',
  record_pdf_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_breeding_records_updated_at on public.breeding_records;
create trigger set_breeding_records_updated_at
  before update on public.breeding_records
  for each row execute function public.set_updated_at();

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.breeding_requests (id) on delete restrict,
  opened_by uuid not null references auth.users (id) on delete restrict,
  assigned_to uuid references auth.users (id) on delete set null,
  status text not null default 'open',
  reason_code text not null,
  description text,
  resolution text,
  resolution_type text,
  payment_intent_id uuid,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists disputes_open_request_idx
  on public.disputes (request_id)
  where status = 'open';

drop trigger if exists set_disputes_updated_at on public.disputes;
create trigger set_disputes_updated_at
  before update on public.disputes
  for each row execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.breeding_requests (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint conversations_context_check check (
    request_id is not null or listing_id is not null
  )
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete restrict,
  body text,
  attachment_path text,
  moderation_status text not null default 'clean',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);

-- Immutability: revoke update/delete on events for authenticated role
revoke update, delete on public.breeding_request_events from authenticated;

-- RLS
alter table public.breeding_requests enable row level security;
alter table public.breeding_request_events enable row level security;
alter table public.breeding_records enable row level security;
alter table public.disputes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

drop policy if exists breeding_requests_participant_read on public.breeding_requests;
create policy breeding_requests_participant_read on public.breeding_requests
  for select using (
    requester_id = auth.uid() or recipient_id = auth.uid()
  );

drop policy if exists breeding_request_events_participant_read on public.breeding_request_events;
create policy breeding_request_events_participant_read on public.breeding_request_events
  for select using (
    exists (
      select 1 from public.breeding_requests br
      where br.id = request_id
        and (br.requester_id = auth.uid() or br.recipient_id = auth.uid())
    )
  );

drop policy if exists breeding_records_participant_read on public.breeding_records;
create policy breeding_records_participant_read on public.breeding_records
  for select using (
    exists (
      select 1 from public.breeding_requests br
      where br.id = request_id
        and (br.requester_id = auth.uid() or br.recipient_id = auth.uid())
    )
  );

drop policy if exists disputes_participant_read on public.disputes;
create policy disputes_participant_read on public.disputes
  for select using (
    exists (
      select 1 from public.breeding_requests br
      where br.id = request_id
        and (br.requester_id = auth.uid() or br.recipient_id = auth.uid())
    )
  );

drop policy if exists conversations_participant_read on public.conversations;
create policy conversations_participant_read on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );

drop policy if exists conversation_participants_own on public.conversation_participants;
create policy conversation_participants_own on public.conversation_participants
  for select using (user_id = auth.uid());

drop policy if exists messages_participant_read on public.messages;
create policy messages_participant_read on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists messages_sender_insert on public.messages;
create policy messages_sender_insert on public.messages
  for insert with check (sender_id = auth.uid());
