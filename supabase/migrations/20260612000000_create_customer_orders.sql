create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  order_number text not null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  estimated_weight numeric(12,2) check (estimated_weight is null or estimated_weight >= 0),
  estimated_total numeric(12,2) not null check (estimated_total > 0),
  deposit_amount numeric(12,2) not null default 0 check (deposit_amount >= 0),
  remaining_amount numeric(12,2) generated always as (
    greatest(estimated_total - deposit_amount, 0)
  ) stored,
  expected_date date,
  status text not null default 'pending' check (
    status in ('pending', 'in_progress', 'ready', 'delivered', 'cancelled')
  ),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint customer_orders_company_number_key unique (company_id, order_number),
  constraint customer_orders_deposit_limit check (deposit_amount <= estimated_total)
);

create index if not exists idx_customer_orders_company_created
on public.customer_orders(company_id, created_at desc);

create index if not exists idx_customer_orders_client
on public.customer_orders(client_id);

drop trigger if exists set_customer_orders_company_context on public.customer_orders;
create trigger set_customer_orders_company_context
before insert on public.customer_orders
for each row execute function public.set_company_context();

drop trigger if exists set_customer_orders_created_by_context on public.customer_orders;
create trigger set_customer_orders_created_by_context
before insert on public.customer_orders
for each row execute function public.set_created_by_context();

drop trigger if exists set_customer_orders_updated_at on public.customer_orders;
create trigger set_customer_orders_updated_at
before update on public.customer_orders
for each row execute function public.set_updated_at();

grant select, insert, update on public.customer_orders to authenticated;

alter table public.customer_orders enable row level security;

drop policy if exists customer_orders_select on public.customer_orders;
create policy customer_orders_select on public.customer_orders
for select to authenticated
using (company_id = private.current_company_id() or private.is_super_admin());

drop policy if exists customer_orders_insert on public.customer_orders;
create policy customer_orders_insert on public.customer_orders
for insert to authenticated
with check (company_id = private.current_company_id());

drop policy if exists customer_orders_update on public.customer_orders;
create policy customer_orders_update on public.customer_orders
for update to authenticated
using (company_id = private.current_company_id() or private.is_super_admin())
with check (company_id = private.current_company_id());
