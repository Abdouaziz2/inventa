ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_name text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo text DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS secondary_phone text DEFAULT '';

UPDATE public.profiles
SET business_name = COALESCE(NULLIF(full_name, ''), 'Ma boutique')
WHERE COALESCE(business_name, '') = '';
