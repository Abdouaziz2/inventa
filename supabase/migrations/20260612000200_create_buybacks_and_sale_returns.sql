create table if not exists public.buybacks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  jewelry_id uuid not null references public.jewelry(id) on delete restrict,
  buyback_number text not null,
  description text not null,
  material_type text not null,
  category text not null default 'other',
  weight numeric(12,2) not null check (weight > 0),
  purchase_amount numeric(12,2) not null check (purchase_amount > 0),
  payment_method text not null default 'cash',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint buybacks_company_number_key unique (company_id, buyback_number)
);

create table if not exists public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  sale_id uuid not null references public.sales(id) on delete restrict,
  return_number text not null,
  refund_amount numeric(12,2) not null check (refund_amount >= 0),
  payment_method text not null default 'cash',
  reason text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  constraint sale_returns_sale_key unique (sale_id),
  constraint sale_returns_company_number_key unique (company_id, return_number)
);

create index if not exists idx_buybacks_company_created on public.buybacks(company_id, created_at desc);
create index if not exists idx_buybacks_client on public.buybacks(client_id);
create index if not exists idx_buybacks_created_by on public.buybacks(created_by);
create index if not exists idx_buybacks_jewelry on public.buybacks(jewelry_id);
create index if not exists idx_sale_returns_company_created on public.sale_returns(company_id, created_at desc);
create index if not exists idx_sale_returns_client on public.sale_returns(client_id);
create index if not exists idx_sale_returns_created_by on public.sale_returns(created_by);

alter table public.buybacks enable row level security;
alter table public.sale_returns enable row level security;

grant select, insert on public.buybacks to authenticated;
grant select, insert on public.sale_returns to authenticated;

create policy buybacks_select on public.buybacks for select to authenticated
using (company_id = private.current_company_id() or private.is_super_admin());
create policy buybacks_insert on public.buybacks for insert to authenticated
with check (company_id = private.current_company_id());

create policy sale_returns_select on public.sale_returns for select to authenticated
using (company_id = private.current_company_id() or private.is_super_admin());
create policy sale_returns_insert on public.sale_returns for insert to authenticated
with check (company_id = private.current_company_id());

create or replace function public.create_buyback(
  p_client_id uuid,
  p_description text,
  p_material_type text,
  p_category text,
  p_weight numeric,
  p_purchase_amount numeric,
  p_payment_method text,
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
    raise exception 'Client introuvable';
  end if;
  if p_weight <= 0 or p_purchase_amount <= 0 then raise exception 'Poids et montant invalides'; end if;

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
    category, weight, purchase_amount, payment_method, notes, created_by
  ) values (
    v_company_id, p_client_id, v_jewelry_id, 'RAC-' || v_suffix, trim(p_description),
    p_material_type, coalesce(nullif(p_category, ''), 'other'), p_weight,
    p_purchase_amount, p_payment_method, nullif(trim(coalesce(p_notes, '')), ''), v_profile_id
  ) returning id into v_buyback_id;

  return v_buyback_id;
end;
$$;

create or replace function public.create_sale_return(
  p_sale_id uuid,
  p_refund_amount numeric,
  p_payment_method text,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_sale public.sales%rowtype;
  v_item record;
  v_return_id uuid;
  v_suffix text;
begin
  select company_id, id into v_company_id, v_profile_id
  from public.profiles where id = auth.uid();

  select * into v_sale from public.sales
  where id = p_sale_id and company_id = v_company_id for update;

  if v_sale.id is null then raise exception 'Vente introuvable'; end if;
  if v_sale.status = 'cancelled' then raise exception 'Cette vente est deja annulee ou retournee'; end if;
  if exists (select 1 from public.sale_returns where sale_id = p_sale_id) then
    raise exception 'Un retour existe deja pour cette vente';
  end if;
  if p_refund_amount < 0 or p_refund_amount > v_sale.total_amount then
    raise exception 'Montant de remboursement invalide';
  end if;

  for v_item in select jewelry_id, quantity from public.sale_items where sale_id = p_sale_id loop
    update public.jewelry
    set quantity = quantity + v_item.quantity, status = 'available'
    where id = v_item.jewelry_id and company_id = v_company_id;
  end loop;

  update public.sales set status = 'cancelled' where id = p_sale_id;
  v_suffix := to_char(timezone('utc', now()), 'YYYYMMDDHH24MISSMS');

  insert into public.sale_returns (
    company_id, client_id, sale_id, return_number, refund_amount,
    payment_method, reason, created_by
  ) values (
    v_company_id, v_sale.client_id, p_sale_id, 'RET-' || v_suffix,
    p_refund_amount, p_payment_method, trim(p_reason), v_profile_id
  ) returning id into v_return_id;

  return v_return_id;
end;
$$;

grant execute on function public.create_buyback(uuid, text, text, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.create_sale_return(uuid, numeric, text, text) to authenticated;
