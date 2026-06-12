-- Stock-first patch for jewelry availability.
-- Apply this after the base schema if your database is already provisioned.

create or replace function public.sync_jewelry_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.quantity <= 0 then
    new.quantity = 0;
    new.status = 'out_of_stock';
  else
    new.status = 'available';
  end if;
  return new;
end;
$$;

create or replace function public.create_reservation(
  p_client_id uuid,
  p_jewelry_id uuid,
  p_deposit_amount numeric,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_reservation_id uuid;
  v_reservation_number text;
  v_jewelry record;
  v_remaining numeric(12,2);
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

  perform 1
  from public.clients
  where id = p_client_id and company_id = v_company_id;

  if not found then
    raise exception 'Client not found';
  end if;

  select *
  into v_jewelry
  from public.jewelry
  where id = p_jewelry_id and company_id = v_company_id
  for update;

  if not found then
    raise exception 'Jewelry not found';
  end if;

  if v_jewelry.quantity <= 0 then
    raise exception 'Jewelry not available';
  end if;

  if coalesce(p_deposit_amount, 0) <= 0 then
    raise exception 'Reservation deposit must be greater than zero';
  end if;

  if p_deposit_amount > v_jewelry.sale_price then
    raise exception 'Reservation deposit cannot exceed jewelry price';
  end if;

  v_remaining := greatest(v_jewelry.sale_price - coalesce(p_deposit_amount, 0), 0);
  v_reservation_number := 'RES-' || to_char(timezone('utc', now()), 'YYYYMMDD-HH24MISSMS');

  insert into public.reservations (
    company_id,
    client_id,
    jewelry_id,
    reservation_number,
    deposit_amount,
    remaining_amount,
    status,
    expires_at,
    created_by
  )
  values (
    v_company_id,
    p_client_id,
    p_jewelry_id,
    v_reservation_number,
    p_deposit_amount,
    v_remaining,
    'active',
    p_expires_at,
    v_profile_id
  )
  returning id into v_reservation_id;

  update public.jewelry
  set
    quantity = quantity - 1,
    status = case
      when quantity - 1 <= 0 then 'out_of_stock'::public.jewelry_status
      else 'available'::public.jewelry_status
    end
  where id = p_jewelry_id;

  return v_reservation_id;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_reservation record;
begin
  select company_id into v_company_id
  from public.profiles
  where id = auth.uid() and is_active = true;

  if v_company_id is null then
    raise exception 'No company linked to profile';
  end if;

  select *
  into v_reservation
  from public.reservations
  where id = p_reservation_id and company_id = v_company_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status <> 'active' then
    raise exception 'Only active reservations can be cancelled';
  end if;

  update public.reservations
  set status = 'cancelled'
  where id = p_reservation_id;

  update public.jewelry
  set quantity = quantity + 1
  where id = v_reservation.jewelry_id and company_id = v_company_id;
end;
$$;

grant execute on function public.cancel_reservation(uuid) to authenticated;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  jewelry_id uuid not null references public.jewelry(id) on delete restrict,
  movement_type text not null check (movement_type in ('entry', 'exit', 'adjustment')),
  quantity_delta integer not null check (quantity_delta <> 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_stock_movements_company_created
on public.stock_movements(company_id, created_at desc);
create index if not exists idx_stock_movements_jewelry
on public.stock_movements(jewelry_id);
create index if not exists idx_stock_movements_created_by
on public.stock_movements(created_by);

alter table public.stock_movements enable row level security;

drop policy if exists stock_movements_select on public.stock_movements;
create policy stock_movements_select on public.stock_movements
for select to authenticated
using (company_id = private.current_company_id() or private.is_super_admin());

drop policy if exists stock_movements_insert on public.stock_movements;
create policy stock_movements_insert on public.stock_movements
for insert to authenticated
with check (company_id = private.current_company_id());

grant select, insert on public.stock_movements to authenticated;

create or replace function public.adjust_jewelry_stock(
  p_jewelry_id uuid,
  p_delta integer,
  p_reason text
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_jewelry record;
  v_next_quantity integer;
begin
  v_profile_id := auth.uid();

  select company_id into v_company_id
  from public.profiles
  where id = v_profile_id and is_active = true;

  if v_company_id is null then
    raise exception 'No company linked to profile';
  end if;

  if p_delta = 0 then
    raise exception 'Stock movement cannot be zero';
  end if;

  if nullif(trim(p_reason), '') is null then
    raise exception 'Stock movement reason is required';
  end if;

  select *
  into v_jewelry
  from public.jewelry
  where id = p_jewelry_id and company_id = v_company_id
  for update;

  if not found then
    raise exception 'Jewelry not found';
  end if;

  v_next_quantity := v_jewelry.quantity + p_delta;
  if v_next_quantity < 0 then
    raise exception 'Insufficient stock';
  end if;

  update public.jewelry
  set quantity = v_next_quantity
  where id = p_jewelry_id;

  insert into public.stock_movements (
    company_id,
    jewelry_id,
    movement_type,
    quantity_delta,
    quantity_before,
    quantity_after,
    reason,
    created_by
  )
  values (
    v_company_id,
    p_jewelry_id,
    case when p_delta > 0 then 'entry' else 'exit' end,
    p_delta,
    v_jewelry.quantity,
    v_next_quantity,
    trim(p_reason),
    v_profile_id
  );

  return v_next_quantity;
end;
$$;

grant execute on function public.adjust_jewelry_stock(uuid, integer, text) to authenticated;

update public.jewelry
set
  quantity = greatest(quantity, 0),
  status = case
    when quantity > 0 then 'available'::public.jewelry_status
    else 'out_of_stock'::public.jewelry_status
  end;
