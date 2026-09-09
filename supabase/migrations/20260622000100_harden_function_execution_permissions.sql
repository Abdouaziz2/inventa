create or replace function private.enforce_financial_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_role text;
  v_row_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select company_id, role::text
  into v_company_id, v_role
  from public.profiles
  where id = auth.uid()
    and is_active = true
    and role in ('admin', 'vendeur');

  if v_company_id is null then
    raise exception 'No active company linked to profile';
  end if;

  if not private.has_active_subscription() then
    raise exception 'Active subscription required';
  end if;

  v_row_company_id := case
    when tg_op = 'DELETE' then old.company_id
    else new.company_id
  end;

  if v_row_company_id is distinct from v_company_id then
    raise exception 'Company mismatch';
  end if;

  if tg_table_name = 'stock_movements' and v_role <> 'admin' then
    raise exception 'Administrator role required for stock adjustments';
  end if;

  if (
    tg_table_name = 'wallet_transactions'
    and tg_op <> 'DELETE'
    and new.operation_type::text in ('balance_adjustment_credit', 'balance_adjustment_debit')
    and v_role <> 'admin'
  ) then
    raise exception 'Administrator role required for balance adjustments';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke execute on function public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text) from public, anon;
revoke execute on function public.create_deposit(uuid, numeric, public.payment_method, text, text) from public, anon;
revoke execute on function public.create_reservation(uuid, uuid, numeric, timestamptz) from public, anon;
revoke execute on function public.cancel_reservation(uuid) from public, anon;
revoke execute on function public.adjust_jewelry_stock(uuid, integer, text) from public, anon;
revoke execute on function public.adjust_client_balance(uuid, numeric, text) from public, anon;
revoke execute on function public.create_buyback(
  uuid, text, text, text, numeric, numeric, text, text, text, text, boolean, text
) from public, anon;
revoke execute on function public.create_sale_return(uuid, numeric, text, text) from public, anon;
revoke execute on function public.expire_due_reservations() from public, anon;
revoke execute on function public.register_document_verification(text, text) from public, anon;

grant execute on function public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text) to authenticated;
grant execute on function public.create_deposit(uuid, numeric, public.payment_method, text, text) to authenticated;
grant execute on function public.create_reservation(uuid, uuid, numeric, timestamptz) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.adjust_jewelry_stock(uuid, integer, text) to authenticated;
grant execute on function public.adjust_client_balance(uuid, numeric, text) to authenticated;
grant execute on function public.create_buyback(
  uuid, text, text, text, numeric, numeric, text, text, text, text, boolean, text
) to authenticated;
grant execute on function public.create_sale_return(uuid, numeric, text, text) to authenticated;
grant execute on function public.expire_due_reservations() to authenticated;
grant execute on function public.register_document_verification(text, text) to authenticated;

drop policy if exists document_verifications_no_direct_access on public.document_verifications;
create policy document_verifications_no_direct_access
on public.document_verifications
as restrictive
for all
to anon, authenticated
using (false)
with check (false);

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.set_company_context()
  set search_path = public, private, pg_temp;

alter function public.set_created_by_context()
  set search_path = public, private, pg_temp;

alter function public.apply_deposit_to_client_balance()
  set search_path = public, pg_temp;
