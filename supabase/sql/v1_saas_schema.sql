drop table if exists public.payments cascade;
drop table if exists public.sale_items cascade;
drop table if exists public.sales cascade;
drop table if exists public.reservations cascade;
drop table if exists public.deposits cascade;
drop table if exists public.jewelry cascade;
drop table if exists public.clients cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

drop function if exists public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text) cascade;
drop function if exists public.apply_deposit_to_client_balance() cascade;
drop function if exists public.sync_jewelry_status() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_super_admin() cascade;
drop function if exists public.current_role() cascade;
drop function if exists public.current_company_id() cascade;
drop function if exists public.set_updated_at() cascade;

drop type if exists public.reservation_status cascade;
drop type if exists public.sale_status cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.jewelry_status cascade;
drop type if exists public.app_role cascade;

create extension if not exists pgcrypto;

create type public.app_role as enum ('super_admin', 'admin', 'vendeur');
create type public.jewelry_status as enum ('available', 'reserved', 'sold', 'out_of_stock');
create type public.payment_method as enum ('cash', 'mobile_money', 'card', 'bank_transfer', 'other');
create type public.sale_status as enum ('completed', 'partial', 'cancelled');
create type public.reservation_status as enum ('active', 'cancelled', 'completed', 'expired');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text default '',
  address text default '',
  currency_code text not null default 'XOF',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  email text not null unique,
  full_name text not null default '',
  phone text default '',
  role public.app_role not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  phone text default '',
  email text,
  balance numeric(12,2) not null default 0 check (balance >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint clients_company_code_key unique (company_id, code)
);

create table if not exists public.jewelry (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null default 'other',
  material_type text not null default 'gold',
  weight numeric(10,2) not null default 0 check (weight >= 0),
  price_per_gram numeric(12,2) not null default 0 check (price_per_gram >= 0),
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  quantity integer not null default 0 check (quantity >= 0),
  status public.jewelry_status not null default 'available',
  photo text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint jewelry_company_code_key unique (company_id, code)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  sale_number text not null,
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  balance_used numeric(12,2) not null default 0 check (balance_used >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
  status public.sale_status not null default 'completed',
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  jewelry_id uuid not null references public.jewelry(id) on delete restrict,
  jewelry_code text not null,
  jewelry_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  weight numeric(10,2) not null default 0 check (weight >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  reference text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  jewelry_id uuid not null references public.jewelry(id) on delete restrict,
  reservation_number text not null,
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  remaining_amount numeric(12,2) not null default 0 check (remaining_amount >= 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reservations_company_number_key unique (company_id, reservation_number)
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  method public.payment_method not null default 'cash',
  reference text,
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_profiles_company on public.profiles(company_id);
create index if not exists idx_clients_company_created on public.clients(company_id, created_at desc);
create index if not exists idx_jewelry_company_status on public.jewelry(company_id, status);
create index if not exists idx_sales_company_created on public.sales(company_id, created_at desc);
create index if not exists idx_sale_items_sale on public.sale_items(sale_id);
create index if not exists idx_payments_sale on public.payments(sale_id);
create index if not exists idx_reservations_company_created on public.reservations(company_id, created_at desc);
create index if not exists idx_deposits_company_created on public.deposits(company_id, created_at desc);

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

drop trigger if exists set_jewelry_updated_at on public.jewelry;
create trigger set_jewelry_updated_at
before update on public.jewelry
for each row
execute function public.set_updated_at();

create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  incoming_company_name text;
begin
  incoming_company_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'company_name', '')), '');

  if incoming_company_name is not null then
    insert into public.companies (name, created_by)
    values (incoming_company_name, new.id)
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.sync_jewelry_status()
returns trigger
language plpgsql
as $$
begin
  if new.quantity <= 0 then
    new.quantity = 0;
    if new.status <> 'sold' then
      new.status = 'out_of_stock';
    end if;
  elsif new.status = 'out_of_stock' then
    new.status = 'available';
  end if;
  return new;
end;
$$;

drop trigger if exists sync_jewelry_status_trigger on public.jewelry;
create trigger sync_jewelry_status_trigger
before insert or update on public.jewelry
for each row
execute function public.sync_jewelry_status();

create or replace function public.apply_deposit_to_client_balance()
returns trigger
language plpgsql
as $$
begin
  update public.clients
  set balance = balance + new.amount
  where id = new.client_id;
  return new;
end;
$$;

drop trigger if exists apply_deposit_to_client_balance_trigger on public.deposits;
create trigger apply_deposit_to_client_balance_trigger
after insert on public.deposits
for each row
execute function public.apply_deposit_to_client_balance();

create or replace function public.create_sale(
  p_client_id uuid,
  p_items jsonb,
  p_payments jsonb default '[]'::jsonb,
  p_balance_used numeric default 0,
  p_discount numeric default 0,
  p_note text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_subtotal numeric(12,2) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_total_amount numeric(12,2);
  v_remaining numeric(12,2);
  v_sale_id uuid;
  v_sale_number text;
  v_client_balance numeric(12,2) := 0;
  item jsonb;
  payment jsonb;
  v_jewelry record;
  v_quantity integer;
  v_line_total numeric(12,2);
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  select company_id into v_company_id
  from public.profiles
  where id = v_profile_id and is_active = true;

  if v_company_id is null then
    raise exception 'No company linked to profile';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale items are required';
  end if;

  if p_client_id is not null then
    select balance into v_client_balance
    from public.clients
    where id = p_client_id and company_id = v_company_id
    for update;

    if not found then
      raise exception 'Client not found';
    end if;
  end if;

  if p_balance_used > v_client_balance then
    raise exception 'Insufficient client balance';
  end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest((item ->> 'quantity')::integer, 0);

    select *
    into v_jewelry
    from public.jewelry
    where id = (item ->> 'jewelry_id')::uuid
      and company_id = v_company_id
    for update;

    if not found then
      raise exception 'Jewelry not found';
    end if;

    if v_quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;

    if v_jewelry.quantity < v_quantity then
      raise exception 'Insufficient stock for %', v_jewelry.name;
    end if;

    v_subtotal := v_subtotal + (v_jewelry.sale_price * v_quantity);
  end loop;

  v_total_amount := greatest(v_subtotal - coalesce(p_discount, 0), 0);

  for payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    v_paid_amount := v_paid_amount + greatest((payment ->> 'amount')::numeric, 0);
  end loop;

  v_paid_amount := v_paid_amount + coalesce(p_balance_used, 0);
  v_remaining := greatest(v_total_amount - v_paid_amount, 0);
  v_sale_number := 'SAL-' || to_char(timezone('utc', now()), 'YYYYMMDD-HH24MISSMS');

  insert into public.sales (
    company_id,
    client_id,
    sale_number,
    subtotal,
    discount,
    total_amount,
    balance_used,
    paid_amount,
    remaining_amount,
    status,
    note,
    created_by
  )
  values (
    v_company_id,
    p_client_id,
    v_sale_number,
    v_subtotal,
    coalesce(p_discount, 0),
    v_total_amount,
    coalesce(p_balance_used, 0),
    v_paid_amount,
    v_remaining,
    case when v_remaining > 0 then 'partial' else 'completed' end,
    p_note,
    v_profile_id
  )
  returning id into v_sale_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (item ->> 'quantity')::integer;

    select *
    into v_jewelry
    from public.jewelry
    where id = (item ->> 'jewelry_id')::uuid
      and company_id = v_company_id
    for update;

    v_line_total := v_jewelry.sale_price * v_quantity;

    insert into public.sale_items (
      company_id,
      sale_id,
      jewelry_id,
      jewelry_code,
      jewelry_name,
      quantity,
      unit_price,
      weight,
      line_total
    )
    values (
      v_company_id,
      v_sale_id,
      v_jewelry.id,
      v_jewelry.code,
      v_jewelry.name,
      v_quantity,
      v_jewelry.sale_price,
      v_jewelry.weight,
      v_line_total
    );

    update public.jewelry
    set
      quantity = quantity - v_quantity,
      status = case
        when quantity - v_quantity <= 0 then 'out_of_stock'
        else 'available'
      end
    where id = v_jewelry.id;
  end loop;

  for payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    insert into public.payments (
      company_id,
      sale_id,
      client_id,
      method,
      amount,
      reference,
      created_by
    )
    values (
      v_company_id,
      v_sale_id,
      p_client_id,
      (payment ->> 'method')::public.payment_method,
      (payment ->> 'amount')::numeric,
      nullif(payment ->> 'reference', ''),
      v_profile_id
    );
  end loop;

  if p_client_id is not null and coalesce(p_balance_used, 0) > 0 then
    update public.clients
    set balance = balance - p_balance_used
    where id = p_client_id;
  end if;

  return v_sale_id;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.jewelry to authenticated;
grant select, insert, update, delete on public.sales to authenticated;
grant select, insert, update, delete on public.sale_items to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.reservations to authenticated;
grant select, insert, update, delete on public.deposits to authenticated;
grant execute on function public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text) to authenticated;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.jewelry enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.payments enable row level security;
alter table public.reservations enable row level security;
alter table public.deposits enable row level security;

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
for select
to authenticated
using (id = public.current_company_id() or public.is_super_admin());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
for update
to authenticated
using (id = public.current_company_id() or public.is_super_admin())
with check (id = public.current_company_id() or public.is_super_admin());

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or company_id = public.current_company_id()
  or public.is_super_admin()
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  or public.is_super_admin()
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or (
    company_id = public.current_company_id()
    and public.current_role() in ('admin', 'super_admin')
  )
  or public.is_super_admin()
)
with check (
  company_id = public.current_company_id()
  or public.is_super_admin()
);

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists clients_insert on public.clients;
create policy clients_insert on public.clients
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists clients_update on public.clients;
create policy clients_update on public.clients
for update
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin())
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists jewelry_select on public.jewelry;
create policy jewelry_select on public.jewelry
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists jewelry_insert on public.jewelry;
create policy jewelry_insert on public.jewelry
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists jewelry_update on public.jewelry;
create policy jewelry_update on public.jewelry
for update
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin())
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists sales_select on public.sales;
create policy sales_select on public.sales
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists sales_insert on public.sales;
create policy sales_insert on public.sales
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists sales_update on public.sales;
create policy sales_update on public.sales
for update
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin())
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists sale_items_select on public.sale_items;
create policy sale_items_select on public.sale_items
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists sale_items_insert on public.sale_items;
create policy sale_items_insert on public.sale_items
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists reservations_select on public.reservations;
create policy reservations_select on public.reservations
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists reservations_update on public.reservations;
create policy reservations_update on public.reservations
for update
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin())
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

drop policy if exists deposits_select on public.deposits;
create policy deposits_select on public.deposits
for select
to authenticated
using (company_id = public.current_company_id() or public.is_super_admin());

drop policy if exists deposits_insert on public.deposits;
create policy deposits_insert on public.deposits
for insert
to authenticated
with check (
  company_id = public.current_company_id()
  and public.current_role() in ('admin', 'vendeur', 'super_admin')
);

insert into storage.buckets (id, name, public)
values ('jewelry-images', 'jewelry-images', false)
on conflict (id) do nothing;

drop policy if exists jewelry_images_select on storage.objects;
create policy jewelry_images_select on storage.objects
for select
to authenticated
using (
  bucket_id = 'jewelry-images'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists jewelry_images_insert on storage.objects;
create policy jewelry_images_insert on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'jewelry-images'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists jewelry_images_update on storage.objects;
create policy jewelry_images_update on storage.objects
for update
to authenticated
using (
  bucket_id = 'jewelry-images'
  and (storage.foldername(name))[1] = public.current_company_id()::text
)
with check (
  bucket_id = 'jewelry-images'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);

drop policy if exists jewelry_images_delete on storage.objects;
create policy jewelry_images_delete on storage.objects
for delete
to authenticated
using (
  bucket_id = 'jewelry-images'
  and (storage.foldername(name))[1] = public.current_company_id()::text
);
