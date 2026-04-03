CREATE OR REPLACE FUNCTION public.can_access_owned_record(_created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _created_by OR public.is_super_admin(auth.uid())
$$;

DROP POLICY IF EXISTS "Users can read scoped clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert scoped clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update scoped clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete scoped clients" ON public.clients;

CREATE POLICY "Users can read owned clients" ON public.clients
FOR SELECT TO authenticated
USING (public.can_access_owned_record(created_by));

CREATE POLICY "Users can insert owned clients" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update owned clients" ON public.clients
FOR UPDATE TO authenticated
USING (public.can_access_owned_record(created_by))
WITH CHECK (public.can_access_owned_record(created_by));

CREATE POLICY "Users can delete owned clients" ON public.clients
FOR DELETE TO authenticated
USING (public.can_access_owned_record(created_by));

DROP POLICY IF EXISTS "Users can read scoped jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can insert scoped jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can update scoped jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Users can delete scoped jewelry" ON public.jewelry;

CREATE POLICY "Users can read owned jewelry" ON public.jewelry
FOR SELECT TO authenticated
USING (public.can_access_owned_record(created_by));

CREATE POLICY "Users can insert owned jewelry" ON public.jewelry
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Users can update owned jewelry" ON public.jewelry
FOR UPDATE TO authenticated
USING (public.can_access_owned_record(created_by))
WITH CHECK (public.can_access_owned_record(created_by));

CREATE POLICY "Users can delete owned jewelry" ON public.jewelry
FOR DELETE TO authenticated
USING (public.can_access_owned_record(created_by));

DROP POLICY IF EXISTS "Users can read scoped deposits" ON public.deposits;
DROP POLICY IF EXISTS "Users can insert scoped deposits" ON public.deposits;

CREATE POLICY "Users can read owned deposits" ON public.deposits
FOR SELECT TO authenticated
USING (public.can_access_owned_record(created_by));

CREATE POLICY "Users can insert owned deposits" ON public.deposits
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can read scoped sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert scoped sales" ON public.sales;

CREATE POLICY "Users can read owned sales" ON public.sales
FOR SELECT TO authenticated
USING (public.can_access_owned_record(created_by));

CREATE POLICY "Users can insert owned sales" ON public.sales
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can read scoped reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can insert scoped reservations" ON public.reservations;

CREATE POLICY "Users can read owned reservations" ON public.reservations
FOR SELECT TO authenticated
USING (public.can_access_owned_record(created_by));

CREATE POLICY "Users can insert owned reservations" ON public.reservations
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() OR public.is_super_admin(auth.uid())
);
