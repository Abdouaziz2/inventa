
-- 1. Add logo to company_settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS logo text DEFAULT '';

-- 2. Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.company_settings(id);

-- 3. Add company_id to all entity tables
ALTER TABLE public.clients ADD COLUMN company_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.jewelry ADD COLUMN company_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.deposits ADD COLUMN company_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.sales ADD COLUMN company_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.reservations ADD COLUMN company_id uuid REFERENCES public.company_settings(id);

-- 4. Backfill existing data with first company
UPDATE public.profiles SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;
UPDATE public.clients SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;
UPDATE public.jewelry SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;
UPDATE public.deposits SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;
UPDATE public.sales SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;
UPDATE public.reservations SET company_id = (SELECT id FROM public.company_settings LIMIT 1) WHERE company_id IS NULL;

-- 5. Create security definer function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 6. Remove ALL anon policies (closed system, no anonymous access)
DROP POLICY IF EXISTS "Anon can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Anon can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Anon can read clients" ON public.clients;
DROP POLICY IF EXISTS "Anon can update clients" ON public.clients;
DROP POLICY IF EXISTS "Anon can delete jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Anon can insert jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Anon can read jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Anon can update jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Anon can insert deposits" ON public.deposits;
DROP POLICY IF EXISTS "Anon can read deposits" ON public.deposits;
DROP POLICY IF EXISTS "Anon can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Anon can read sales" ON public.sales;
DROP POLICY IF EXISTS "Anon can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anon can read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Anon can insert login logs" ON public.login_logs;

-- 7. Drop old authenticated policies and replace with company-scoped ones

-- CLIENTS
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

CREATE POLICY "Users can read own company clients" ON public.clients
FOR SELECT TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own company clients" ON public.clients
FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own company clients" ON public.clients
FOR UPDATE TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own company clients" ON public.clients
FOR DELETE TO authenticated USING (company_id = get_my_company_id());

-- JEWELRY
DROP POLICY IF EXISTS "Authenticated users can read jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Authenticated users can insert jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Authenticated users can update jewelry" ON public.jewelry;
DROP POLICY IF EXISTS "Authenticated users can delete jewelry" ON public.jewelry;

CREATE POLICY "Users can read own company jewelry" ON public.jewelry
FOR SELECT TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own company jewelry" ON public.jewelry
FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "Users can update own company jewelry" ON public.jewelry
FOR UPDATE TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can delete own company jewelry" ON public.jewelry
FOR DELETE TO authenticated USING (company_id = get_my_company_id());

-- DEPOSITS
DROP POLICY IF EXISTS "Authenticated users can read deposits" ON public.deposits;
DROP POLICY IF EXISTS "Authenticated users can insert deposits" ON public.deposits;

CREATE POLICY "Users can read own company deposits" ON public.deposits
FOR SELECT TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own company deposits" ON public.deposits
FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

-- SALES
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;

CREATE POLICY "Users can read own company sales" ON public.sales
FOR SELECT TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own company sales" ON public.sales
FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

-- RESERVATIONS
DROP POLICY IF EXISTS "Authenticated users can read reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can insert reservations" ON public.reservations;

CREATE POLICY "Users can read own company reservations" ON public.reservations
FOR SELECT TO authenticated USING (company_id = get_my_company_id());

CREATE POLICY "Users can insert own company reservations" ON public.reservations
FOR INSERT TO authenticated WITH CHECK (company_id = get_my_company_id());

-- LOGIN LOGS: allow insert for both anon and authenticated (needed for login flow)
CREATE POLICY "Anyone can insert login logs" ON public.login_logs
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- COMPANY SETTINGS: users can only read their own company
DROP POLICY IF EXISTS "Authenticated can read company settings" ON public.company_settings;
CREATE POLICY "Users can read own company settings" ON public.company_settings
FOR SELECT TO authenticated USING (id = get_my_company_id());
