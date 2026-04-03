ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.jewelry ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.clients c
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.company_id = c.company_id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE c.created_by IS NULL;

UPDATE public.jewelry j
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.company_id = j.company_id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE j.created_by IS NULL;

UPDATE public.deposits d
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.company_id = d.company_id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE d.created_by IS NULL;

UPDATE public.sales s
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.company_id = s.company_id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE s.created_by IS NULL;

UPDATE public.reservations r
SET created_by = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.company_id = r.company_id
  ORDER BY p.created_at
  LIMIT 1
)
WHERE r.created_by IS NULL;

ALTER TABLE public.clients ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.jewelry ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.deposits ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.sales ALTER COLUMN created_by SET DEFAULT auth.uid();
ALTER TABLE public.reservations ALTER COLUMN created_by SET DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.is_company_manager_or_above(_user_id uuid)
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
      AND role IN ('super_admin', 'admin', 'manager')
  )
$$;

DROP POLICY IF EXISTS "Users can read own company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own company clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own company clients" ON public.clients;

CREATE POLICY "Users can read scoped clients" ON public.clients
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can insert scoped clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can update scoped clients" ON public.clients
FOR UPDATE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can delete scoped clients" ON public.clients
FOR DELETE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can read own company jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can insert own company jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can update own company jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can delete own company jewelry" ON public.jewelry;

CREATE POLICY "Users can read scoped jewelry" ON public.jewelry
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can insert scoped jewelry" ON public.jewelry
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can update scoped jewelry" ON public.jewelry
FOR UPDATE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
)
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can delete scoped jewelry" ON public.jewelry
FOR DELETE TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can read own company deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can insert own company deposits" ON public.deposits;

CREATE POLICY "Users can read scoped deposits" ON public.deposits
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can insert scoped deposits" ON public.deposits
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can read own company sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert own company sales" ON public.sales;

CREATE POLICY "Users can read scoped sales" ON public.sales
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can insert scoped sales" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can read own company reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert own company reservations" ON public.reservations;

CREATE POLICY "Users can read scoped reservations" ON public.reservations
FOR SELECT TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);

CREATE POLICY "Users can insert scoped reservations" ON public.reservations
FOR INSERT TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND (
    created_by = auth.uid()
    OR public.is_company_manager_or_above(auth.uid())
  )
);
