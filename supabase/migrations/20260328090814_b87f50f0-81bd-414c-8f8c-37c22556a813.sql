
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'JewelStock',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated can read company settings" ON public.company_settings
  FOR SELECT TO authenticated USING (true);

-- Only super admin can modify
CREATE POLICY "Super admin can insert company settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update company settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (is_super_admin(auth.uid()));

-- Insert default row
INSERT INTO public.company_settings (name, phone, address) VALUES ('JewelStock', '', '');

-- Trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
