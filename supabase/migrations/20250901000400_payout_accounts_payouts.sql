-- M5 payments: payout accounts and payouts.

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  provider text not null,
  account_type text not null,
  account_reference text not null,
  status text not null default 'unverified',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payout_accounts_owner_idx
  on public.payout_accounts (owner_id);

drop trigger if exists set_payout_accounts_updated_at on public.payout_accounts;
create trigger set_payout_accounts_updated_at
  before update on public.payout_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payee_id uuid not null references auth.users (id) on delete restrict,
  payout_account_id uuid not null references public.payout_accounts (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  status text not null default 'pending',
  provider text not null,
  provider_reference text,
  idempotency_key text not null,
  approved_by uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, idempotency_key)
);

create index if not exists payouts_payee_idx
  on public.payouts (payee_id, created_at desc);

alter table public.ledger_entries
  add constraint ledger_entries_payout_fk
  foreign key (payout_id) references public.payouts (id) on delete restrict;

drop trigger if exists set_payouts_updated_at on public.payouts;
create trigger set_payouts_updated_at
  before update on public.payouts
  for each row execute function public.set_updated_at();

alter table public.payout_accounts enable row level security;
alter table public.payouts enable row level security;

drop policy if exists payout_accounts_owner_all on public.payout_accounts;
create policy payout_accounts_owner_all on public.payout_accounts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists payouts_payee_read on public.payouts;
create policy payouts_payee_read on public.payouts
  for select using (payee_id = auth.uid());
