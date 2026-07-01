-- M5 payments: immutable ledger entries.

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid references public.payment_intents (id) on delete restrict,
  payout_id uuid,
  account_type text not null,
  account_id uuid,
  entry_type text not null,
  transaction_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency_code text not null,
  direction text not null check (direction in ('debit', 'credit')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_account_idx
  on public.ledger_entries (account_type, account_id, created_at desc);
create index if not exists ledger_entries_transaction_idx
  on public.ledger_entries (transaction_id);
create index if not exists ledger_entries_intent_idx
  on public.ledger_entries (payment_intent_id)
  where payment_intent_id is not null;

alter table public.ledger_entries enable row level security;

drop policy if exists ledger_entries_payee_read on public.ledger_entries;
create policy ledger_entries_payee_read on public.ledger_entries
  for select using (account_id = auth.uid());

revoke update, delete on public.ledger_entries from authenticated, anon;
