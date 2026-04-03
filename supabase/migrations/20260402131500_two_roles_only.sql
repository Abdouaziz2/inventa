UPDATE public.user_roles
SET role = 'admin'
WHERE role IN ('manager', 'seller');

CREATE OR REPLACE FUNCTION public.is_company_admin_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_company_manager_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_company_admin_or_above(_user_id)
$$;
