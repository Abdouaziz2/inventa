do $migration$
declare
  v_definition text;
  v_old_expression constant text :=
    'case when v_remaining > 0 then ''partial'' else ''completed'' end';
  v_new_expression constant text :=
    '(case when v_remaining > 0 then ''partial'' else ''completed'' end)::public.sale_status';
begin
  select pg_get_functiondef(p.oid)
  into v_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_sale'
    and pg_get_function_identity_arguments(p.oid) = 'p_client_id uuid, p_items jsonb, p_payments jsonb, p_balance_used numeric, p_discount numeric, p_note text';

  if v_definition is null then
    raise exception 'create_sale function not found';
  end if;

  if position(v_old_expression in v_definition) = 0 then
    if position(v_new_expression in v_definition) > 0 then
      return;
    end if;
    raise exception 'create_sale status expression not recognized';
  end if;

  execute replace(v_definition, v_old_expression, v_new_expression);
end;
$migration$;
