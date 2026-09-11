-- Wave Business Checkout: paid subscription flow.
--
-- Behavior:
--  * `subscriptions` gains `frequency` and `amount` (NULL for legacy rows).
--  * `wave_checkout_sessions` records each payment intent created server-side.
--  * `subscription_payments` is an append-only ledger; its unique keys make
--    webhook processing idempotent (a delivered event can only activate once).
--  * All writes happen with the service_role key (edge functions). Users may
--    only SELECT their own rows (RLS). No INSERT/UPDATE/DELETE policy exists
--    for authenticated roles, so end users cannot forge or mutate payments.

-- 1. Extend subscriptions for paid plans ----------------------------------
alter table public.subscriptions
  add column if not exists frequency text
    check (frequency in ('monthly', 'yearly'));
alter table public.subscriptions
  add column if not exists amount integer
    check (amount is null or amount > 0);

-- 2. Checkout intents ------------------------------------------------------
create table if not exists public.wave_checkout_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('starter', 'business', 'premium')),
  frequency text not null check (frequency in ('monthly', 'yearly')),
  amount integer not null check (amount > 0),
  currency text not null default 'XOF',
  wave_session_id text,
  client_reference text not null,
  checkout_status text
    check (checkout_status in ('open', 'complete', 'expired')),
  payment_status text
    check (payment_status in ('processing', 'cancelled', 'succeeded', 'failed')),
  transaction_id text,
  last_payment_error jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists idx_wave_checkout_sessions_client_ref
  on public.wave_checkout_sessions (client_reference);
create unique index if not exists idx_wave_checkout_sessions_wave_id
  on public.wave_checkout_sessions (wave_session_id)
  where wave_session_id is not null;
create index if not exists idx_wave_checkout_sessions_user_created
  on public.wave_checkout_sessions (user_id, created_at desc);

drop trigger if exists set_wave_checkout_sessions_updated_at on public.wave_checkout_sessions;
create trigger set_wave_checkout_sessions_updated_at
  before update on public.wave_checkout_sessions
  for each row
  execute function public.set_updated_at();

-- 3. Payment ledger (idempotency) -----------------------------------------
create table if not exists public.subscription_payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_code text not null check (plan_code in ('starter', 'business', 'premium')),
  frequency text not null check (frequency in ('monthly', 'yearly')),
  amount integer not null check (amount > 0),
  currency text not null default 'XOF',
  wave_session_id text not null,
  transaction_id text,
  wave_event_id text,
  status text not null check (status in ('succeeded', 'failed')),
  last_payment_error jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint subscription_payments_session_id_key unique (wave_session_id),
  constraint subscription_payments_event_id_key unique (wave_event_id)
);

create unique index if not exists idx_subscription_payments_transaction_id
  on public.subscription_payments (transaction_id)
  where transaction_id is not null;
create index if not exists idx_subscription_payments_user_created
  on public.subscription_payments (user_id, created_at desc);

-- 4. RLS -------------------------------------------------------------------
alter table public.wave_checkout_sessions enable row level security;
alter table public.subscription_payments enable row level security;

revoke all on public.wave_checkout_sessions from anon;
revoke all on public.subscription_payments from anon;
grant select on public.wave_checkout_sessions to authenticated;
grant select on public.subscription_payments to authenticated;

drop policy if exists wave_checkout_sessions_select_own on public.wave_checkout_sessions;
create policy wave_checkout_sessions_select_own on public.wave_checkout_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_super_admin());

drop policy if exists subscription_payments_select_own on public.subscription_payments;
create policy subscription_payments_select_own on public.subscription_payments
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_super_admin());

-- 5. Atomic, idempotent activation ------------------------------------------
-- Called by the Edge Functions with the service_role key. The period is
-- computed in shared TS (src/lib/wave.ts, unit-tested) and persisted here in
-- a single transaction so a payment can never be "charged but not activated",
-- and a replayed event can never activate twice.
--
-- SECURITY INVOKER on purpose: end users invoking it are blocked by RLS
-- (no INSERT policy on subscription_payments, only SELECT-own). Only the
-- service_role (BYpasses RLS) can complete the writes.
create or replace function public.record_wave_payment(
  p_user_id uuid,
  p_plan_code text,
  p_frequency text,
  p_amount integer,
  p_currency text,
  p_wave_session_id text,
  p_transaction_id text,
  p_wave_event_id text,
  p_paid_at timestamptz,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_intent_id bigint
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_ledger_id bigint;
begin
  -- Record the payment exactly once (unique wave_session_id). A replay skips
  -- this insert and returns duplicate WITHOUT touching the subscription.
  insert into public.subscription_payments (
    user_id, plan_code, frequency, amount, currency,
    wave_session_id, transaction_id, wave_event_id, status, paid_at
  )
  values (
    p_user_id, p_plan_code, p_frequency, p_amount, p_currency,
    p_wave_session_id, p_transaction_id, p_wave_event_id, 'succeeded', p_paid_at
  )
  on conflict (wave_session_id) do nothing
  returning id into v_ledger_id;

  if not found then
    return jsonb_build_object('kind', 'duplicate');
  end if;

  insert into public.subscriptions (
    user_id, email, plan_code, frequency, amount, status, starts_at, expires_at
  )
  values (
    p_user_id, p_user_id::text, p_plan_code, p_frequency, p_amount,
    'active', p_starts_at, p_expires_at
  )
  on conflict (user_id) do update
  set
    email = coalesce(public.subscriptions.email, excluded.email),
    plan_code = excluded.plan_code,
    frequency = excluded.frequency,
    amount = excluded.amount,
    status = excluded.status,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at;

  update public.wave_checkout_sessions
  set
    checkout_status = 'complete',
    payment_status = 'succeeded',
    transaction_id = p_transaction_id,
    last_payment_error = null
  where id = p_intent_id;

  return jsonb_build_object('kind', 'activated');
end;
$$;

revoke execute on function public.record_wave_payment(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, timestamptz, bigint) from public, anon;
grant execute on function public.record_wave_payment(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, timestamptz, bigint) to authenticated, service_role;