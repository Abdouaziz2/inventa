-- Migration: Add new gold materials and make weight/price fields optional
-- This script is idempotent and safe to run multiple times.

-- 1. Update the 'material_type' check constraint to include new gold karats
-- We create a new type, copy data, drop old, rename new.
DO $$
BEGIN
    -- Check if the new constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'jewelry_material_type_check_v2'
    ) THEN
        -- Create the new check constraint
        ALTER TABLE public.jewelry
        ADD CONSTRAINT jewelry_material_type_check_v2
        CHECK (material_type IN ('gold_14k', 'gold_18k', 'gold_21k', 'gold_22k', 'gold_24k', 'silver', 'diamond'));

        -- Drop the old check constraint if it exists
        ALTER TABLE public.jewelry
        DROP CONSTRAINT IF EXISTS jewelry_material_type_check;

        -- Rename the new constraint to the standard name
        ALTER TABLE public.jewelry
        RENAME CONSTRAINT jewelry_material_type_check_v2 TO jewelry_material_type_check;
    END IF;
END $$;

-- 2. Make weight, price_per_gram, purchase_price, and sale_price columns nullable
-- These changes are safe and won't delete client data.
ALTER TABLE public.jewelry
ALTER COLUMN weight DROP NOT NULL,
ALTER COLUMN price_per_gram DROP NOT NULL,
ALTER COLUMN purchase_price DROP NOT NULL,
ALTER COLUMN sale_price DROP NOT NULL;

-- Ensure existing NULLs are treated as 0 if any exist, though the schema defaults should handle new inserts.
UPDATE public.jewelry SET weight = 0 WHERE weight IS NULL;
UPDATE public.jewelry SET price_per_gram = 0 WHERE price_per_gram IS NULL;
UPDATE public.jewelry SET purchase_price = 0 WHERE purchase_price IS NULL;
UPDATE public.jewelry SET sale_price = 0 WHERE sale_price IS NULL;
