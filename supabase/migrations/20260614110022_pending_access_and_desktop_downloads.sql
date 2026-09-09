-- New accounts remain blocked until a super administrator explicitly approves them.
create or replace function private.create_user_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.subscriptions (
    user_id,
    email,
    plan_code,
    status,
    starts_at,
    expires_at
  )
  values (
    new.id,
    lower(new.email),
    'standard',
    'suspended',
    timezone('utc', now()),
    null
  )
  on conflict (user_id) do update
  set email = excluded.email;

  return new;
end;
$$;

insert into storage.buckets (id, name, public)
values ('desktop-releases', 'desktop-releases', false)
on conflict (id) do update set public = false;

drop policy if exists desktop_releases_active_subscription_select on storage.objects;
create policy desktop_releases_active_subscription_select on storage.objects
for select
to authenticated
using (
  bucket_id = 'desktop-releases'
  and private.has_active_subscription()
);
