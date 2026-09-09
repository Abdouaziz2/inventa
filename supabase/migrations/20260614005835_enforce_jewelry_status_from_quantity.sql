create or replace function private.sync_jewelry_status_from_quantity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.quantity := greatest(coalesce(new.quantity, 0), 0);
  new.status := case
    when new.quantity > 0 then 'available'::public.jewelry_status
    else 'out_of_stock'::public.jewelry_status
  end;
  return new;
end;
$$;

drop trigger if exists sync_jewelry_status_from_quantity on public.jewelry;

create trigger sync_jewelry_status_from_quantity
before insert or update of quantity, status
on public.jewelry
for each row
execute function private.sync_jewelry_status_from_quantity();

update public.jewelry
set status = case
  when quantity > 0 then 'available'::public.jewelry_status
  else 'out_of_stock'::public.jewelry_status
end
where status is distinct from case
  when quantity > 0 then 'available'::public.jewelry_status
  else 'out_of_stock'::public.jewelry_status
end;
