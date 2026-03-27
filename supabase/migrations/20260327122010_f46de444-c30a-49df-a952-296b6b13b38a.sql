
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'manager', 'seller');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  status user_status NOT NULL DEFAULT 'active',
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT NOT NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.login_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
$$;

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS SETOF public.user_roles
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.user_roles WHERE user_id = auth.uid()
$$;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can read login logs" ON public.login_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Authenticated can insert login logs" ON public.login_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anon can insert login logs" ON public.login_logs FOR INSERT TO anon WITH CHECK (true);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
