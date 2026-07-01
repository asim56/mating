-- M5 payments: subscription plans and subscriptions.

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  region_id uuid not null references public.regions (id) on delete restrict,
  code text not null,
  name text not null,
  interval text not null check (interval in ('month', 'year')),
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  features jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  unique (region_id, code)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid not null references auth.users (id) on delete restrict,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  payment_intent_id uuid references public.payment_intents (id) on delete set null,
  provider text,
  provider_reference text,
  status text not null default 'active',
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_subscriber_idx
  on public.subscriptions (subscriber_id, created_at desc);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists subscription_plans_read on public.subscription_plans;
create policy subscription_plans_read on public.subscription_plans
  for select using (active = true);

drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions
  for select using (subscriber_id = auth.uid());

-- Regional plan seed data (PK + US stubs)
insert into public.subscription_plans (region_id, code, name, interval, amount, currency_code, features)
select r.id, 'breeder_pro_monthly', 'Breeder Pro Monthly', 'month', 2500.00, 'PKR', '{"boosts": 1}'::jsonb
from public.regions r where r.code = 'PK'
on conflict (region_id, code) do nothing;

insert into public.subscription_plans (region_id, code, name, interval, amount, currency_code, features)
select r.id, 'breeder_pro_monthly', 'Breeder Pro Monthly', 'month', 29.99, 'USD', '{"boosts": 1}'::jsonb
from public.regions r where r.code = 'US'
on conflict (region_id, code) do nothing;
