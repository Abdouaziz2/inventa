
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jewelry table
CREATE TYPE public.jewelry_status AS ENUM ('available', 'reserved', 'sold');
CREATE TYPE public.jewelry_category AS ENUM ('rings', 'necklaces', 'bracelets', 'earrings', 'watches', 'other');

CREATE TABLE public.jewelry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category jewelry_category NOT NULL DEFAULT 'other',
  weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  purchase_price BIGINT NOT NULL DEFAULT 0,
  sale_price BIGINT NOT NULL DEFAULT 0,
  status jewelry_status NOT NULL DEFAULT 'available',
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  jewelry_id UUID NOT NULL REFERENCES public.jewelry(id),
  total_price BIGINT NOT NULL,
  paid_from_balance BIGINT NOT NULL DEFAULT 0,
  paid_cash BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  jewelry_id UUID NOT NULL REFERENCES public.jewelry(id),
  deposit_amount BIGINT NOT NULL DEFAULT 0,
  remaining_amount BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jewelry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Authenticated users full access
CREATE POLICY "Authenticated users can read clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read jewelry" ON public.jewelry FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jewelry" ON public.jewelry FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jewelry" ON public.jewelry FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete jewelry" ON public.jewelry FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can read deposits" ON public.deposits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert deposits" ON public.deposits FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can read reservations" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert reservations" ON public.reservations FOR INSERT TO authenticated WITH CHECK (true);

-- Anonymous access for demo mode (app uses mock auth currently)
CREATE POLICY "Anon can read clients" ON public.clients FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert clients" ON public.clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update clients" ON public.clients FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete clients" ON public.clients FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read jewelry" ON public.jewelry FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert jewelry" ON public.jewelry FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update jewelry" ON public.jewelry FOR UPDATE TO anon USING (true);
CREATE POLICY "Anon can delete jewelry" ON public.jewelry FOR DELETE TO anon USING (true);

CREATE POLICY "Anon can read deposits" ON public.deposits FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert deposits" ON public.deposits FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can read sales" ON public.sales FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert sales" ON public.sales FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anon can read reservations" ON public.reservations FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert reservations" ON public.reservations FOR INSERT TO anon WITH CHECK (true);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jewelry_updated_at BEFORE UPDATE ON public.jewelry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-generate client code (6 digits)
CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TRIGGER AS $$
DECLARE
  next_code INT;
BEGIN
  SELECT COALESCE(MAX(code::INT), 100000) + 1 INTO next_code FROM public.clients;
  NEW.code = next_code::TEXT;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_client_code BEFORE INSERT ON public.clients FOR EACH ROW WHEN (NEW.code IS NULL OR NEW.code = '') EXECUTE FUNCTION public.generate_client_code();
