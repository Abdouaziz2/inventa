-- Additive performance hardening for the SaaS data model.
-- These indexes target foreign keys and common list/detail filters used by the UI.

create index if not exists idx_companies_created_by
on public.companies(created_by);

create index if not exists idx_profiles_active_company_role
on public.profiles(company_id, role)
where is_active = true;

create index if not exists idx_clients_created_by
on public.clients(created_by);

create index if not exists idx_clients_company_name
on public.clients(company_id, name);

create index if not exists idx_jewelry_created_by
on public.jewelry(created_by);

create index if not exists idx_jewelry_company_created
on public.jewelry(company_id, created_at desc);

create index if not exists idx_jewelry_company_name
on public.jewelry(company_id, name);

create index if not exists idx_jewelry_available_company_name
on public.jewelry(company_id, name)
where status = 'available'::public.jewelry_status and quantity > 0;

create index if not exists idx_sales_client_created
on public.sales(client_id, created_at desc);

create index if not exists idx_sales_created_by
on public.sales(created_by);

create index if not exists idx_sale_items_company
on public.sale_items(company_id);

create index if not exists idx_sale_items_jewelry
on public.sale_items(jewelry_id);

create index if not exists idx_payments_company_created
on public.payments(company_id, created_at desc);

create index if not exists idx_payments_client_created
on public.payments(client_id, created_at desc);

create index if not exists idx_payments_created_by
on public.payments(created_by);

create index if not exists idx_reservations_client_created
on public.reservations(client_id, created_at desc);

create index if not exists idx_reservations_jewelry
on public.reservations(jewelry_id);

create index if not exists idx_reservations_created_by
on public.reservations(created_by);

create index if not exists idx_reservations_active_expiry
on public.reservations(company_id, expires_at)
where status = 'active'::public.reservation_status and expires_at is not null;

create index if not exists idx_deposits_client_created
on public.deposits(client_id, created_at desc);

create index if not exists idx_deposits_created_by
on public.deposits(created_by);

create index if not exists idx_wallet_transactions_company_created
on public.wallet_transactions(company_id, created_at desc);

create index if not exists idx_wallet_transactions_created_by
on public.wallet_transactions(created_by);

create index if not exists idx_customer_orders_status_created
on public.customer_orders(company_id, status, created_at desc);

create index if not exists idx_access_requests_reviewed_by
on public.access_requests(reviewed_by);

create index if not exists idx_document_verifications_created_by
on public.document_verifications(created_by);

create index if not exists idx_sale_returns_sale
on public.sale_returns(sale_id);
