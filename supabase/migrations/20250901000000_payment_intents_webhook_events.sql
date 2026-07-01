-- M5 payments: payment intents and webhook events.

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.breeding_requests (id) on delete set null,
  payer_id uuid not null references auth.users (id) on delete restrict,
  payee_id uuid references auth.users (id) on delete set null,
  provider text not null,
  provider_reference text,
  purpose text not null,
  status text not null default 'created',
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create index if not exists payment_intents_payer_idx
  on public.payment_intents (payer_id, created_at desc);
create index if not exists payment_intents_request_idx
  on public.payment_intents (request_id)
  where request_id is not null;
create index if not exists payment_intents_status_idx
  on public.payment_intents (status, created_at desc);

drop trigger if exists set_payment_intents_updated_at on public.payment_intents;
create trigger set_payment_intents_updated_at
  before update on public.payment_intents
  for each row execute function public.set_updated_at();

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  payment_intent_id uuid references public.payment_intents (id) on delete set null,
  payload_hash text not null,
  status text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists webhook_events_intent_idx
  on public.webhook_events (payment_intent_id)
  where payment_intent_id is not null;

alter table public.payment_intents enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists payment_intents_payer_read on public.payment_intents;
create policy payment_intents_payer_read on public.payment_intents
  for select using (payer_id = auth.uid() or payee_id = auth.uid());

drop policy if exists webhook_events_no_client on public.webhook_events;
create policy webhook_events_no_client on public.webhook_events
  for select using (false);

revoke update, delete on public.webhook_events from authenticated, anon;
