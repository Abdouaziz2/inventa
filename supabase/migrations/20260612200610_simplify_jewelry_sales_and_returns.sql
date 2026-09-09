alter table public.buybacks
alter column jewelry_id drop not null;

create or replace function public.create_buyback(
  p_client_id uuid,
  p_description text,
  p_material_type text,
  p_category text,
  p_weight numeric,
  p_purchase_amount numeric,
  p_payment_method text,
  p_proof_type text,
  p_proof_reference text,
  p_proof_owner_name text,
  p_ownership_verified boolean,
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_buyback_id uuid;
  v_suffix text;
begin
  select company_id, id into v_company_id, v_profile_id
  from public.profiles where id = auth.uid();

  if v_company_id is null then raise exception 'Boutique non configuree'; end if;
  if not exists (select 1 from public.clients where id = p_client_id and company_id = v_company_id) then
    raise exception 'Vendeur introuvable';
  end if;
  if p_weight <= 0 or p_purchase_amount <= 0 then raise exception 'Poids et montant invalides'; end if;
  if not p_ownership_verified then raise exception 'La propriete du bijou doit etre verifiee'; end if;
  if nullif(trim(p_proof_reference), '') is null or nullif(trim(p_proof_owner_name), '') is null then
    raise exception 'La facture et le nom du proprietaire sont obligatoires';
  end if;

  v_suffix := to_char(timezone('utc', now()), 'YYYYMMDDHH24MISSMS');

  insert into public.buybacks (
    company_id, client_id, jewelry_id, buyback_number, description, material_type,
    category, weight, purchase_amount, payment_method, proof_type, proof_reference,
    proof_owner_name, ownership_verified, notes, created_by
  ) values (
    v_company_id, p_client_id, null, 'RET-' || v_suffix, trim(p_description),
    p_material_type, coalesce(nullif(p_category, ''), 'other'), p_weight,
    p_purchase_amount, p_payment_method, trim(p_proof_type), trim(p_proof_reference),
    trim(p_proof_owner_name), true, nullif(trim(coalesce(p_notes, '')), ''), v_profile_id
  ) returning id into v_buyback_id;

  return v_buyback_id;
end;
$$;

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
security invoker
set search_path = ''
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
  v_weight numeric(12,2);
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then raise exception 'Not authenticated'; end if;

  select company_id into v_company_id
  from public.profiles
  where id = v_profile_id and is_active = true;

  if v_company_id is null then raise exception 'No company linked to profile'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sale items are required';
  end if;

  if p_client_id is not null then
    select balance into v_client_balance
    from public.clients
    where id = p_client_id and company_id = v_company_id
    for update;
    if not found then raise exception 'Client not found'; end if;
  end if;

  if p_balance_used > v_client_balance then raise exception 'Insufficient client balance'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := greatest((item ->> 'quantity')::integer, 0);
    v_weight := greatest(coalesce((item ->> 'weight')::numeric, 0), 0);
    v_unit_price := greatest(coalesce((item ->> 'unit_price')::numeric, 0), 0);

    select * into v_jewelry
    from public.jewelry
    where id = (item ->> 'jewelry_id')::uuid and company_id = v_company_id
    for update;

    if not found then raise exception 'Jewelry not found'; end if;
    if v_quantity <= 0 or v_weight <= 0 or v_unit_price <= 0 then
      raise exception 'Invalid quantity, weight or unit price';
    end if;
    if v_jewelry.quantity < v_quantity then
      raise exception 'Insufficient stock for %', v_jewelry.name;
    end if;

    v_subtotal := v_subtotal + (v_weight * v_unit_price * v_quantity);
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
    company_id, client_id, sale_number, subtotal, discount, total_amount,
    balance_used, paid_amount, remaining_amount, status, note, created_by
  ) values (
    v_company_id, p_client_id, v_sale_number, v_subtotal, coalesce(p_discount, 0),
    v_total_amount, coalesce(p_balance_used, 0), v_paid_amount, v_remaining,
    (case when v_remaining > 0 then 'partial' else 'completed' end)::public.sale_status,
    p_note, v_profile_id
  ) returning id into v_sale_id;

  for item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (item ->> 'quantity')::integer;
    v_weight := (item ->> 'weight')::numeric;
    v_unit_price := (item ->> 'unit_price')::numeric;

    select * into v_jewelry
    from public.jewelry
    where id = (item ->> 'jewelry_id')::uuid and company_id = v_company_id
    for update;

    v_line_total := v_weight * v_unit_price * v_quantity;

    insert into public.sale_items (
      company_id, sale_id, jewelry_id, jewelry_code, jewelry_name,
      material_type, quantity, unit_price, weight, line_total
    ) values (
      v_company_id, v_sale_id, v_jewelry.id, v_jewelry.code, v_jewelry.name,
      v_jewelry.material_type, v_quantity, v_unit_price, v_weight, v_line_total
    );

    update public.jewelry
    set quantity = quantity - v_quantity,
        status = case
          when quantity - v_quantity <= 0 then 'out_of_stock'::public.jewelry_status
          else 'available'::public.jewelry_status
        end
    where id = v_jewelry.id;
  end loop;

  for payment in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb))
  loop
    insert into public.payments (
      company_id, sale_id, client_id, method, amount, reference, created_by
    ) values (
      v_company_id, v_sale_id, p_client_id,
      (payment ->> 'method')::public.payment_method,
      (payment ->> 'amount')::numeric,
      nullif(payment ->> 'reference', ''), v_profile_id
    );
  end loop;

  if p_client_id is not null and coalesce(p_balance_used, 0) > 0 then
    insert into public.wallet_transactions (
      company_id, client_id, operation_type, operation_id, document_number,
      amount, balance_before, balance_after, created_by
    )
    select v_company_id, p_client_id, 'sale_balance_debit', v_sale_id, v_sale_number,
      -p_balance_used, balance, balance - p_balance_used, v_profile_id
    from public.clients where id = p_client_id;

    update public.clients set balance = balance - p_balance_used where id = p_client_id;
  end if;

  return v_sale_id;
end;
$$;

grant execute on function public.create_buyback(
  uuid, text, text, text, numeric, numeric, text, text, text, text, boolean, text
) to authenticated;
grant execute on function public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text) to authenticated;
