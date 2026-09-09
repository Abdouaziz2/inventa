alter table public.companies
  add column if not exists business_type text not null default 'jewelry';

alter table public.companies
  drop constraint if exists companies_business_type_check;

alter table public.companies
  add constraint companies_business_type_check
  check (business_type = 'jewelry');

alter table public.access_requests
  add column if not exists business_type text not null default 'jewelry';

alter table public.access_requests
  drop constraint if exists access_requests_business_type_check;

alter table public.access_requests
  add constraint access_requests_business_type_check
  check (business_type = 'jewelry');

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_company_id uuid;
  incoming_company_name text;
  incoming_business_type text;
begin
  incoming_company_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');
  incoming_business_type := 'jewelry';

  if incoming_company_name is not null then
    insert into public.companies (name, business_type, created_by)
    values (incoming_company_name, incoming_business_type, new.id)
    returning id into new_company_id;
  end if;

  insert into public.profiles (id, company_id, email, full_name, role)
  values (
    new.id,
    new_company_id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'admin'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name;

  return new;
end;
$$;

create or replace function private.create_access_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  incoming_business_type text;
begin
  incoming_business_type := 'jewelry';

  insert into public.access_requests (
    user_id,
    email,
    full_name,
    company_name,
    business_type,
    status
  )
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'company_name', ''),
    incoming_business_type,
    'pending'
  )
  on conflict (user_id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    company_name = excluded.company_name,
    business_type = excluded.business_type;

  return new;
end;
$$;

comment on column public.companies.business_type is
  'Kept for compatibility. Inventa V1 is configured for jewelry stores.';
