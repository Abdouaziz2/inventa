create or replace function public.create_reservation(
  p_client_id uuid,
  p_jewelry_id uuid,
  p_deposit_amount numeric,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_reservation_id uuid;
  v_reservation_number text;
  v_jewelry record;
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then raise exception 'Not authenticated'; end if;

  select company_id into v_company_id
  from public.profiles
  where id = v_profile_id and is_active = true;

  if v_company_id is null then raise exception 'No company linked to profile'; end if;

  perform 1 from public.clients
  where id = p_client_id and company_id = v_company_id;
  if not found then raise exception 'Client not found'; end if;

  select * into v_jewelry
  from public.jewelry
  where id = p_jewelry_id and company_id = v_company_id
  for update;

  if not found then raise exception 'Jewelry not found'; end if;
  if v_jewelry.quantity <= 0 then raise exception 'Jewelry not available'; end if;
  if coalesce(p_deposit_amount, 0) <= 0 then
    raise exception 'Reservation deposit must be greater than zero';
  end if;

  v_reservation_number := 'RES-' || to_char(timezone('utc', now()), 'YYYYMMDD-HH24MISSMS');

  insert into public.reservations (
    company_id, client_id, jewelry_id, reservation_number, deposit_amount,
    remaining_amount, status, expires_at, created_by
  ) values (
    v_company_id, p_client_id, p_jewelry_id, v_reservation_number,
    p_deposit_amount, 0, 'active', p_expires_at, v_profile_id
  ) returning id into v_reservation_id;

  update public.jewelry
  set quantity = quantity - 1,
      status = case
        when quantity - 1 <= 0 then 'out_of_stock'::public.jewelry_status
        else 'available'::public.jewelry_status
      end
  where id = p_jewelry_id;

  return v_reservation_id;
end;
$$;

grant execute on function public.create_reservation(uuid, uuid, numeric, timestamptz) to authenticated;
