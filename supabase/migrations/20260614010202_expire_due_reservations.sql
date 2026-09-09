create or replace function public.expire_due_reservations()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expired_count integer := 0;
begin
  with expired as (
    update public.reservations
    set status = 'expired'::public.reservation_status
    where company_id = private.current_company_id()
      and status = 'active'::public.reservation_status
      and expires_at is not null
      and expires_at < now()
    returning jewelry_id
  ),
  grouped as (
    select jewelry_id, count(*)::integer as quantity_to_restore
    from expired
    where jewelry_id is not null
    group by jewelry_id
  ),
  restored as (
    update public.jewelry as jewelry
    set quantity = jewelry.quantity + grouped.quantity_to_restore
    from grouped
    where jewelry.id = grouped.jewelry_id
    returning jewelry.id
  )
  select count(*)::integer
  into v_expired_count
  from expired;

  return v_expired_count;
end;
$$;

revoke all on function public.expire_due_reservations() from public;
grant execute on function public.expire_due_reservations() to authenticated;
