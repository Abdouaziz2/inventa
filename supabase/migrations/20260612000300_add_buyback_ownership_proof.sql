alter table public.buybacks
add column if not exists proof_type text,
add column if not exists proof_reference text,
add column if not exists proof_owner_name text,
add column if not exists ownership_verified boolean not null default false;

drop function if exists public.create_buyback(uuid, text, text, text, numeric, numeric, text, text);

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
  v_jewelry_id uuid;
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

  insert into public.jewelry (
    company_id, code, name, category, material_type, weight, price_per_gram,
    purchase_price, sale_price, quantity, status, created_by
  ) values (
    v_company_id, 'RAC-' || v_suffix, trim(p_description), coalesce(nullif(p_category, ''), 'other'),
    p_material_type, p_weight, 0, p_purchase_amount, 0, 1, 'available', v_profile_id
  ) returning id into v_jewelry_id;

  insert into public.buybacks (
    company_id, client_id, jewelry_id, buyback_number, description, material_type,
    category, weight, purchase_amount, payment_method, proof_type, proof_reference,
    proof_owner_name, ownership_verified, notes, created_by
  ) values (
    v_company_id, p_client_id, v_jewelry_id, 'RAC-' || v_suffix, trim(p_description),
    p_material_type, coalesce(nullif(p_category, ''), 'other'), p_weight,
    p_purchase_amount, p_payment_method, trim(p_proof_type), trim(p_proof_reference),
    trim(p_proof_owner_name), true, nullif(trim(coalesce(p_notes, '')), ''), v_profile_id
  ) returning id into v_buyback_id;

  return v_buyback_id;
end;
$$;

grant execute on function public.create_buyback(
  uuid, text, text, text, numeric, numeric, text, text, text, text, boolean, text
) to authenticated;
