-- Email-linked subscription access for Gems Flow Suite.

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'subscription_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.subscription_status as enum (
      'trialing',
      'active',
      'past_due',
      'suspended',
      'canceled'
    );
  end if;
end
$$;

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  plan_code text not null default 'standard',
  status public.subscription_status not null default 'trialing',
  starts_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_email on public.subscriptions(lower(email));
create index if not exists idx_subscriptions_status_expiry
  on public.subscriptions(status, expires_at);

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

create or replace function private.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role = 'super_admin'
        and profile.is_active = true
    )
    or exists (
      select 1
      from public.subscriptions subscription
      join public.profiles profile on profile.id = subscription.user_id
      where subscription.user_id = auth.uid()
        and profile.is_active = true
        and subscription.status in ('trialing', 'active')
        and (
          subscription.expires_at is null
          or subscription.expires_at > timezone('utc', now())
        )
    ),
    false
  )
$$;

create or replace function private.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_access_fields on public.profiles;
create trigger protect_profile_access_fields
before update on public.profiles
for each row
execute function private.protect_profile_access_fields();

create or replace function private.create_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (
    user_id,
    email,
    plan_code,
    status,
    starts_at,
    expires_at
  )
  values (
    new.id,
    lower(new.email),
    'standard',
    'trialing',
    timezone('utc', now()),
    timezone('utc', now()) + interval '14 days'
  )
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_subscription_created on auth.users;
create trigger on_auth_user_subscription_created
after insert or update of email on auth.users
for each row
execute function private.create_user_subscription();

insert into public.subscriptions (
  user_id,
  email,
  plan_code,
  status,
  starts_at,
  expires_at
)
select
  user_account.id,
  lower(user_account.email),
  'standard',
  'trialing',
  timezone('utc', now()),
  timezone('utc', now()) + interval '14 days'
from auth.users user_account
where user_account.email is not null
on conflict (user_id) do update
set email = excluded.email;

grant select, update on public.subscriptions to authenticated;
revoke insert, delete on public.subscriptions from anon, authenticated;
grant usage on type public.subscription_status to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.has_active_subscription() to authenticated;

alter table public.subscriptions enable row level security;

drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.is_super_admin()
);

drop policy if exists subscriptions_update_super_admin on public.subscriptions;
create policy subscriptions_update_super_admin on public.subscriptions
for update
to authenticated
using (private.is_super_admin())
with check (private.is_super_admin());

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'companies',
    'clients',
    'jewelry',
    'stock_movements',
    'sales',
    'sale_items',
    'payments',
    'reservations',
    'deposits',
    'wallet_transactions'
  ]
  loop
    execute format(
      'drop policy if exists subscription_required on public.%I',
      table_name
    );
    execute format(
      'create policy subscription_required on public.%I as restrictive for all to authenticated using (private.has_active_subscription()) with check (private.has_active_subscription())',
      table_name
    );
  end loop;
end
$$;
