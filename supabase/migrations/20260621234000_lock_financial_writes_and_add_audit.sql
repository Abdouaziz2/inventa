create or replace function private.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
      and company_id is not null
  );
$$;

create or replace function private.enforce_financial_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_row_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select company_id
  into v_company_id
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

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_company_created
on public.audit_logs(company_id, created_at desc);

create index if not exists idx_audit_logs_actor_created
on public.audit_logs(actor_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select
on public.audit_logs
for select
to authenticated
using (
  private.is_super_admin()
  or (
    company_id = private.current_company_id()
    and private.is_company_admin()
  )
);

revoke all on table public.audit_logs from anon, authenticated;
grant select on table public.audit_logs to authenticated;

create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_source jsonb;
begin
  v_old := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_new := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  v_source := coalesce(v_new, v_old);

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
    nullif(v_source ->> 'company_id', '')::uuid,
    auth.uid(),
    tg_table_name,
    nullif(v_source ->> 'id', '')::uuid,
    tg_op,
    v_old,
    v_new
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'sales',
    'sale_items',
    'payments',
    'deposits',
    'wallet_transactions',
    'reservations',
    'stock_movements',
    'buybacks',
    'sale_returns'
  ]
  loop
    execute format('drop trigger if exists enforce_financial_actor on public.%I', v_table);
    execute format(
      'create trigger enforce_financial_actor before insert or update or delete on public.%I for each row execute function private.enforce_financial_actor()',
      v_table
    );

    execute format('drop trigger if exists write_audit_log on public.%I', v_table);
    execute format(
      'create trigger write_audit_log after insert or update or delete on public.%I for each row execute function private.write_audit_log()',
      v_table
    );
  end loop;

  drop trigger if exists write_audit_log on public.customer_orders;
  create trigger write_audit_log
  after insert or update or delete on public.customer_orders
  for each row execute function private.write_audit_log();
end;
$$;

alter function public.create_sale(uuid, jsonb, jsonb, numeric, numeric, text)
  security definer
  set search_path = public, private, pg_temp;

alter function public.create_deposit(uuid, numeric, public.payment_method, text, text)
  security definer
  set search_path = public, private, pg_temp;

alter function public.create_reservation(uuid, uuid, numeric, timestamptz)
  security definer
  set search_path = public, private, pg_temp;

alter function public.cancel_reservation(uuid)
  security definer
  set search_path = public, private, pg_temp;

alter function public.adjust_jewelry_stock(uuid, integer, text)
  security definer
  set search_path = public, private, pg_temp;

alter function public.adjust_client_balance(uuid, numeric, text)
  security definer
  set search_path = public, private, pg_temp;

alter function public.create_buyback(
  uuid, text, text, text, numeric, numeric, text, text, text, text, boolean, text
)
  security definer
  set search_path = public, private, pg_temp;

alter function public.create_sale_return(uuid, numeric, text, text)
  security definer
  set search_path = public, private, pg_temp;

alter function public.expire_due_reservations()
  security definer
  set search_path = public, private, pg_temp;

revoke insert, update, delete on table public.sales from authenticated;
revoke insert, update, delete on table public.sale_items from authenticated;
revoke insert, update, delete on table public.payments from authenticated;
revoke insert, update, delete on table public.deposits from authenticated;
revoke insert, update, delete on table public.wallet_transactions from authenticated;
revoke insert, update, delete on table public.reservations from authenticated;
revoke insert, update, delete on table public.stock_movements from authenticated;
revoke insert, update, delete on table public.buybacks from authenticated;
revoke insert, update, delete on table public.sale_returns from authenticated;

grant execute on function private.is_company_admin() to authenticated;
