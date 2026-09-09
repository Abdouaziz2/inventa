create or replace function private.is_super_admin()
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
      and role = 'super_admin'
      and is_active = true
  );
$$;

create or replace function private.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_super_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
    new.company_id := old.company_id;
  end if;

  return new;
end;
$$;

drop policy if exists profiles_update on public.profiles;

create policy profiles_update
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or private.is_super_admin()
)
with check (
  id = auth.uid()
  or private.is_super_admin()
);

revoke delete on table public.profiles from authenticated;
