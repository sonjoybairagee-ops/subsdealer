-- Update Adobe Creative Cloud Plans
-- Keep: 1 Month (৳399), 3 Months (৳1,150), 4 Months (৳1,399)
-- Remove: 6 Months, 12 Months

begin;

-- Get the Adobe product ID
DO $$
DECLARE
  adobe_product_id UUID;
BEGIN
  SELECT id INTO adobe_product_id
  FROM public.sub_products
  WHERE slug = 'adobe-creative-cloud'
  LIMIT 1;

  IF adobe_product_id IS NOT NULL THEN
    -- Delete all existing plans for Adobe Creative Cloud
    DELETE FROM public.sub_plans
    WHERE product_id = adobe_product_id;

    -- Insert only 1, 3, and 4 month plans
    INSERT INTO public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
    VALUES
      (adobe_product_id, '1 Month', 30, 399::numeric, 2394::numeric, 10, true),
      (adobe_product_id, '3 Months', 90, 1150::numeric, 6900::numeric, 20, true),
      (adobe_product_id, '4 Months', 120, 1399::numeric, 8394::numeric, 30, true);
  END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

commit;
