alter table public.deposits
add column if not exists status text not null default 'active'
  check (status in ('active', 'cancelled')),
add column if not exists cancelled_at timestamptz,
add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
add column if not exists cancellation_reason text;

create index if not exists idx_deposits_company_status_created
on public.deposits(company_id, status, created_at desc);

create or replace function public.cancel_deposit(
  p_deposit_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_deposit public.deposits%rowtype;
  v_balance_before numeric(12,2);
  v_balance_after numeric(12,2);
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  if not private.is_company_admin() then
    raise exception 'Seul un administrateur peut annuler un dépôt.';
  end if;

  v_company_id := private.current_company_id();
  if v_company_id is null then
    raise exception 'Boutique non configurée.';
  end if;

  select *
  into v_deposit
  from public.deposits
  where id = p_deposit_id
    and company_id = v_company_id
  for update;

  if not found then
    raise exception 'Dépôt introuvable.';
  end if;

  if v_deposit.status = 'cancelled' then
    raise exception 'Ce dépôt est déjà annulé.';
  end if;

  select balance
  into v_balance_before
  from public.clients
  where id = v_deposit.client_id
    and company_id = v_company_id
  for update;

  if not found then
    raise exception 'Client introuvable.';
  end if;

  if v_balance_before < v_deposit.amount then
    raise exception 'Impossible d’annuler ce dépôt: le solde actuel du client est insuffisant.';
  end if;

  v_balance_after := v_balance_before - v_deposit.amount;

  update public.deposits
  set status = 'cancelled',
      cancelled_at = timezone('utc', now()),
      cancelled_by = v_profile_id,
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = v_deposit.id;

  update public.clients
  set balance = v_balance_after
  where id = v_deposit.client_id;

  insert into public.wallet_transactions (
    company_id,
    client_id,
    operation_type,
    operation_id,
    document_number,
    amount,
    balance_before,
    balance_after,
    created_by
  )
  values (
    v_company_id,
    v_deposit.client_id,
    'deposit_cancellation',
    v_deposit.id,
    v_deposit.deposit_number || '-ANN',
    -v_deposit.amount,
    v_balance_before,
    v_balance_after,
    v_profile_id
  );

  return v_deposit.id;
end;
$$;

create or replace function public.purge_test_data(
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_company_id uuid;
  v_profile_id uuid;
  v_counts jsonb := '{}'::jsonb;
  v_deleted integer;
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_confirmation <> 'SUPPRIMER TEST' then
    raise exception 'Confirmation invalide.';
  end if;

  if not private.is_company_admin() then
    raise exception 'Seul un administrateur peut réinitialiser les données test.';
  end if;

  v_company_id := private.current_company_id();
  if v_company_id is null then
    raise exception 'Boutique non configurée.';
  end if;

  delete from public.document_verifications where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('document_verifications', v_deleted);

  delete from public.sale_returns where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('sale_returns', v_deleted);

  delete from public.buybacks where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('buybacks', v_deleted);

  delete from public.customer_orders where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('customer_orders', v_deleted);

  delete from public.reservations where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('reservations', v_deleted);

  delete from public.payments where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('payments', v_deleted);

  delete from public.sale_items where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('sale_items', v_deleted);

  delete from public.sales where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('sales', v_deleted);

  delete from public.deposits where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('deposits', v_deleted);

  delete from public.wallet_transactions where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('wallet_transactions', v_deleted);

  delete from public.stock_movements where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('stock_movements', v_deleted);

  delete from public.jewelry where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('jewelry', v_deleted);

  delete from public.clients where company_id = v_company_id;
  get diagnostics v_deleted = row_count;
  v_counts := v_counts || jsonb_build_object('clients', v_deleted);

  delete from public.audit_logs where company_id = v_company_id;

  insert into public.audit_logs (
    company_id,
    actor_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data
  )
  values (
    v_company_id,
    v_profile_id,
    'company_test_data',
    null,
    'DELETE',
    null,
    jsonb_build_object('purged_counts', v_counts)
  );

  return v_counts;
end;
$$;

revoke execute on function public.cancel_deposit(uuid, text) from public, anon;
revoke execute on function public.purge_test_data(text) from public, anon;
grant execute on function public.cancel_deposit(uuid, text) to authenticated;
grant execute on function public.purge_test_data(text) to authenticated;
