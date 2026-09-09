create table if not exists public.document_verifications (
  token uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_kind text not null check (
    document_kind in ('deposit', 'sale', 'reservation', 'order', 'buyback', 'return')
  ),
  document_number text not null,
  document_type text not null,
  business_name text not null,
  client_name text not null,
  amount numeric(12,2) not null,
  document_date timestamptz not null,
  payment_method text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (company_id, document_kind, document_number)
);

create index if not exists idx_document_verifications_company_created
on public.document_verifications(company_id, created_at desc);

alter table public.document_verifications enable row level security;
revoke all on table public.document_verifications from anon, authenticated;

create or replace function public.register_document_verification(
  p_document_kind text,
  p_document_number text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_company_id uuid;
  v_document_type text;
  v_business_name text;
  v_client_name text;
  v_amount numeric(12,2);
  v_document_date timestamptz;
  v_payment_method text;
  v_token uuid;
begin
  v_profile_id := auth.uid();

  select company_id
  into v_company_id
  from public.profiles
  where id = v_profile_id
    and is_active = true
    and role in ('admin', 'vendeur');

  if v_company_id is null then
    raise exception 'No active company linked to profile';
  end if;

  if not private.has_active_subscription() then
    raise exception 'Active subscription required';
  end if;

  select name into v_business_name
  from public.companies
  where id = v_company_id;

  case p_document_kind
    when 'deposit' then
      select 'Reçu de dépôt', c.name, d.amount, d.created_at, d.method::text
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.deposits d
      join public.clients c on c.id = d.client_id
      where d.company_id = v_company_id
        and d.deposit_number = p_document_number;
    when 'sale' then
      select
        'Facture de vente',
        coalesce(c.name, 'Vente comptoir'),
        s.total_amount,
        s.created_at,
        coalesce(
          (
            select string_agg(distinct p.method::text, ', ')
            from public.payments p
            where p.sale_id = s.id
          ),
          'Non renseigné'
        )
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.sales s
      left join public.clients c on c.id = s.client_id
      where s.company_id = v_company_id
        and s.sale_number = p_document_number;
    when 'reservation' then
      select 'Bon de réservation', c.name, r.deposit_amount, r.created_at, 'Acompte'
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.reservations r
      join public.clients c on c.id = r.client_id
      where r.company_id = v_company_id
        and r.reservation_number = p_document_number;
    when 'order' then
      select 'Bon de commande', c.name, o.estimated_total, o.created_at, 'Acompte'
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.customer_orders o
      join public.clients c on c.id = o.client_id
      where o.company_id = v_company_id
        and o.order_number = p_document_number;
    when 'buyback' then
      select 'Bon d''achat retour', c.name, b.purchase_amount, b.created_at, b.payment_method
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.buybacks b
      join public.clients c on c.id = b.client_id
      where b.company_id = v_company_id
        and b.buyback_number = p_document_number;
    when 'return' then
      select 'Bon de remboursement', coalesce(c.name, 'Client'), r.refund_amount, r.created_at, r.payment_method
      into v_document_type, v_client_name, v_amount, v_document_date, v_payment_method
      from public.sale_returns r
      left join public.clients c on c.id = r.client_id
      where r.company_id = v_company_id
        and r.return_number = p_document_number;
    else
      raise exception 'Unsupported document type';
  end case;

  if v_document_date is null then
    raise exception 'Document not found';
  end if;

  insert into public.document_verifications (
    company_id,
    document_kind,
    document_number,
    document_type,
    business_name,
    client_name,
    amount,
    document_date,
    payment_method,
    created_by
  )
  values (
    v_company_id,
    p_document_kind,
    p_document_number,
    v_document_type,
    coalesce(nullif(trim(v_business_name), ''), 'Bijouterie'),
    v_client_name,
    v_amount,
    v_document_date,
    v_payment_method,
    v_profile_id
  )
  on conflict (company_id, document_kind, document_number)
  do update set
    document_type = excluded.document_type,
    business_name = excluded.business_name,
    client_name = excluded.client_name,
    amount = excluded.amount,
    document_date = excluded.document_date,
    payment_method = excluded.payment_method,
    updated_at = timezone('utc', now())
  returning token into v_token;

  return v_token;
end;
$$;

create or replace function public.verify_document(p_token uuid)
returns table (
  document_type text,
  document_number text,
  business_name text,
  client_name text,
  amount numeric,
  document_date timestamptz,
  payment_method text,
  registered_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    verification.document_type,
    verification.document_number,
    verification.business_name,
    verification.client_name,
    verification.amount,
    verification.document_date,
    verification.payment_method,
    verification.created_at
  from public.document_verifications verification
  where verification.token = p_token;
$$;

revoke all on function public.register_document_verification(text, text) from public;
grant execute on function public.register_document_verification(text, text) to authenticated;

revoke all on function public.verify_document(uuid) from public;
grant execute on function public.verify_document(uuid) to anon, authenticated;
