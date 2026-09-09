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
  v_operation_type text;
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
    when tg_op = 'DELETE' then nullif(to_jsonb(old) ->> 'company_id', '')::uuid
    else nullif(to_jsonb(new) ->> 'company_id', '')::uuid
  end;

  if v_row_company_id is distinct from v_company_id then
    raise exception 'Company mismatch';
  end if;

  if tg_table_name = 'stock_movements' and v_role <> 'admin' then
    raise exception 'Administrator role required for stock adjustments';
  end if;

  v_operation_type := case
    when tg_op = 'DELETE' then to_jsonb(old) ->> 'operation_type'
    else to_jsonb(new) ->> 'operation_type'
  end;

  if (
    tg_table_name = 'wallet_transactions'
    and v_operation_type in ('balance_adjustment_credit', 'balance_adjustment_debit')
    and v_role <> 'admin'
  ) then
    raise exception 'Administrator role required for balance adjustments';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
