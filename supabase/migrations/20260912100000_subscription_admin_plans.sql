-- Administrable SaaS subscriptions.
--
-- Additive, non-destructive. Builds on top of the existing Wave checkout
-- flow (wave_checkout_sessions, subscription_payments, record_wave_payment)
-- and the existing trial created by private.create_user_subscription().
--
-- Adds:
--   1. 'expired' to the subscription_status enum.
--   2. subscription_plans / subscription_plan_prices / subscription_settings
--      (server-side billing configuration, seeded with current values).
--   3. trial_started_at / trial_ends_at on subscriptions (with a safe
--      backfill for existing trialing rows).
--   4. A settings-driven trial in create_user_subscription (no more hardcoded
--      14 days). Never recreates/extends an existing trial.
--   5. public.expire_trials() (trial -> expired) + optional pg_cron schedule.
--   6. RLS: everyone reads active catalog data, only super admins write.

-- 1. Expired status -------------------------------------------------------
do $dec$
begin
  alter type public.subscription_status add value if not exists 'expired';
exception
  when duplicate_object then null;
end
$dec$;

-- 2. Billing configuration tables -----------------------------------------
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,31}$'),
  name text not null check (length(btrim(name)) > 0),
  description text,
  active boolean not null default true,
  recommended boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists subscription_plans_code_key
  on public.subscription_plans (code);

create table if not exists public.subscription_plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  frequency text not null check (frequency in ('monthly', 'yearly')),
  amount integer not null check (amount > 0),
  currency text not null default 'XOF' check (length(currency) between 2 and 8),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscription_plan_prices_plan_frequency_key unique (plan_id, frequency)
);

create table if not exists public.subscription_settings (
  id boolean primary key default true check (id),
  trial_enabled boolean not null default true,
  trial_duration_days integer not null default 14
    check (trial_duration_days between 1 and 90),
  currency text not null default 'XOF' check (length(currency) between 2 and 8),
  updated_by uuid,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_subscription_plans_updated_at on public.subscription_plans;
create trigger set_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_subscription_plan_prices_updated_at on public.subscription_plan_prices;
create trigger set_subscription_plan_prices_updated_at
  before update on public.subscription_plan_prices
  for each row execute function public.set_updated_at();

drop trigger if exists set_subscription_settings_updated_at on public.subscription_settings;
create trigger set_subscription_settings_updated_at
  before update on public.subscription_settings
  for each row execute function public.set_updated_at();

-- 3. Seed: current plans & prices & trial defaults ------------------------
insert into public.subscription_plans (code, name, description, active, recommended, display_order)
values
  ('starter',  'Starter',  'La base pour gérer votre bijouterie au quotidien.', true, false, 10),
  ('business', 'Business', 'Pour les bijouteries qui veulent aller plus loin.',  true, true,  20),
  ('premium',  'Premium',  'La solution complète pour les professionnels.',     true, false, 30)
on conflict (code) do nothing;

insert into public.subscription_plan_prices (plan_id, frequency, amount, currency)
select p.id, pr.frequency, pr.amount, 'XOF'
from (values
  ('starter',  'monthly', 5000),
  ('starter',  'yearly',  50000),
  ('business', 'monthly', 10000),
  ('business', 'yearly',  100000),
  ('premium',  'monthly', 25000),
  ('premium',  'yearly',  250000)
) as pr (plan_code, frequency, amount)
join public.subscription_plans p on p.code = pr.plan_code
on conflict (plan_id, frequency) do nothing;

insert into public.subscription_settings (id, trial_enabled, trial_duration_days, currency)
values (true, true, 14, 'XOF')
on conflict (id) do nothing;

-- 4. RLS -------------------------------------------------------------------
alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_prices enable row level security;
alter table public.subscription_settings enable row level security;

drop policy if exists subscription_plans_select_all on public.subscription_plans;
create policy subscription_plans_select_all on public.subscription_plans
  for select using (true);

drop policy if exists subscription_plans_admin_write on public.subscription_plans;
create policy subscription_plans_admin_write on public.subscription_plans
  for all using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists subscription_plan_prices_select_all on public.subscription_plan_prices;
create policy subscription_plan_prices_select_all on public.subscription_plan_prices
  for select using (true);

drop policy if exists subscription_plan_prices_admin_write on public.subscription_plan_prices;
create policy subscription_plan_prices_admin_write on public.subscription_plan_prices
  for all using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists subscription_settings_select_all on public.subscription_settings;
create policy subscription_settings_select_all on public.subscription_settings
  for select using (true);

drop policy if exists subscription_settings_admin_write on public.subscription_settings;
create policy subscription_settings_admin_write on public.subscription_settings
  for all using (private.is_super_admin()) with check (private.is_super_admin());

revoke all on public.subscription_plans, public.subscription_plan_prices, public.subscription_settings from public;
grant select on public.subscription_plans, public.subscription_plan_prices, public.subscription_settings
  to anon, authenticated;
grant insert, update, delete on public.subscription_plans, public.subscription_plan_prices, public.subscription_settings
  to authenticated, service_role;

-- 5. Trial metadata on subscriptions --------------------------------------
alter table public.subscriptions
  add column if not exists trial_started_at timestamptz;
alter table public.subscriptions
  add column if not exists trial_ends_at timestamptz;

-- Safe backfill: only rows currently in trial, only where not already set.
update public.subscriptions
   set trial_started_at = starts_at,
       trial_ends_at = expires_at
 where status = 'trialing'
   and trial_ends_at is null;

-- 6. Settings-driven trial creation ----------------------------------------
-- Keeps the exact prior behaviour (plan 'standard', status 'trialing',
-- ON CONFLICT never extends an existing period) but reads the trial length
-- and toggle from subscription_settings.
create or replace function private.create_user_subscription()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_trial_enabled boolean := true;
  v_trial_days integer := 14;
  v_settings record;
begin
  select trial_enabled, trial_duration_days
    into v_trial_enabled, v_trial_days
    from public.subscription_settings
   where id = true;

  if v_trial_enabled is null then v_trial_enabled := true; end if;
  if v_trial_days is null or v_trial_days < 1 or v_trial_days > 90 then
    v_trial_days := 14;
  end if;

  if not v_trial_enabled then
    -- Trials disabled: keep the legacy email sync only.
    insert into public.subscriptions (user_id, email, plan_code, status, starts_at, expires_at)
    values (
      new.id,
      lower(new.email),
      'standard',
      'trialing',
      timezone('utc', now()) - interval '1 day',
      timezone('utc', now()) - interval '1 day'
    )
    on conflict (user_id) do update
      set email = excluded.email;
    return new;
  end if;

  insert into public.subscriptions (
    user_id, email, plan_code, status, starts_at, expires_at,
    trial_started_at, trial_ends_at
  )
  values (
    new.id,
    lower(new.email),
    'standard',
    'trialing',
    timezone('utc', now()),
    timezone('utc', now()) + make_interval(days => v_trial_days),
    timezone('utc', now()),
    timezone('utc', now()) + make_interval(days => v_trial_days)
  )
  on conflict (user_id) do update
    set email = excluded.email,
        trial_started_at = case
          when public.subscriptions.status = 'trialing'
            then coalesce(public.subscriptions.trial_started_at, excluded.trial_started_at)
          else public.subscriptions.trial_started_at
        end,
        trial_ends_at = case
          when public.subscriptions.status = 'trialing'
            then coalesce(public.subscriptions.trial_ends_at, excluded.trial_ends_at)
          else public.subscriptions.trial_ends_at
        end;

  return new;
end;
$function$;

-- 7. Trial expiry (trial -> expired) ---------------------------------------
-- SECURITY DEFINER so callers (frontend, subscription-status, pg_cron) can
-- flip their own past-due trials. The WHERE clause is fixed: only trialing
-- rows already past their trial end are touched.
create or replace function public.expire_trials()
returns integer
language plpgsql
security definer
set search_path to public
as $function$
declare
  v_count integer;
begin
  update public.subscriptions
     set status = 'expired',
         updated_at = timezone('utc', now())
   where status = 'trialing'
     and trial_ends_at is not null
     and trial_ends_at <= timezone('utc', now());
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke execute on function public.expire_trials() from public;
grant execute on function public.expire_trials() to authenticated, service_role;

-- 8. Optional daily scheduler (pg_cron) ------------------------------------
do $cron$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron')
     and not exists (select 1 from cron.job where jobname = 'expire-subscription-trials') then
    perform cron.schedule(
      'expire-subscription-trials',
      '0 3 * * *',
      $$select public.expire_trials()$$
    );
  end if;
end
$cron$;