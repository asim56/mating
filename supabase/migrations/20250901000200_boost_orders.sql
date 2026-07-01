-- M5 payments: boost orders.

create table if not exists public.boost_orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  buyer_id uuid not null references auth.users (id) on delete restrict,
  payment_intent_id uuid references public.payment_intents (id) on delete set null,
  boost_type text not null,
  status text not null default 'pending',
  starts_at timestamptz,
  ends_at timestamptz,
  amount numeric(12, 2) not null,
  currency_code text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists boost_orders_buyer_idx
  on public.boost_orders (buyer_id, created_at desc);
create index if not exists boost_orders_listing_idx
  on public.boost_orders (listing_id);

drop trigger if exists set_boost_orders_updated_at on public.boost_orders;
create trigger set_boost_orders_updated_at
  before update on public.boost_orders
  for each row execute function public.set_updated_at();

alter table public.boost_orders enable row level security;

drop policy if exists boost_orders_owner_read on public.boost_orders;
create policy boost_orders_owner_read on public.boost_orders
  for select using (buyer_id = auth.uid());
