do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'access_request_status'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.access_request_status as enum ('pending', 'approved', 'rejected');
  end if;
end
$$;

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  company_name text not null default '',
  status public.access_request_status not null default 'pending',
  notified_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_access_requests_status_created
  on public.access_requests(status, created_at desc);

drop trigger if exists set_access_requests_updated_at on public.access_requests;
create trigger set_access_requests_updated_at
before update on public.access_requests
for each row
execute function public.set_updated_at();

create or replace function private.create_access_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.access_requests (
    user_id,
    email,
    full_name,
    company_name,
    status
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    'pending'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    company_name = excluded.company_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_access_request_created on auth.users;
create trigger on_auth_user_access_request_created
after insert on auth.users
for each row
execute function private.create_access_request();

insert into public.access_requests (
  user_id,
  email,
  full_name,
  company_name,
  status,
  reviewed_at
)
select
  profile.id,
  lower(profile.email),
  profile.full_name,
  coalesce(company.name, ''),
  case
    when subscription.status in ('active', 'trialing') then 'approved'::public.access_request_status
    when subscription.status = 'canceled' then 'rejected'::public.access_request_status
    else 'pending'::public.access_request_status
  end,
  case
    when subscription.status in ('active', 'trialing', 'canceled') then subscription.updated_at
    else null
  end
from public.profiles profile
left join public.companies company on company.id = profile.company_id
left join public.subscriptions subscription on subscription.user_id = profile.id
where profile.role <> 'super_admin'
on conflict (user_id) do nothing;

alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;
grant usage on type public.access_request_status to authenticated;

drop policy if exists access_requests_super_admin_select on public.access_requests;
create policy access_requests_super_admin_select on public.access_requests
for select
to authenticated
using (private.is_super_admin());
