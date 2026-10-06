-- ============================================================
-- Canva Pro: Single 12 Months (Yearly) Plan Only
-- Disables 1 Month, 3 Months, and 6 Months plans
-- ============================================================

BEGIN;

-- 1. Activate and set 12 Months plan
UPDATE public.sub_plans sp
   SET price_bdt = 99,
       name = '12 Months (Yearly)',
       duration_days = 365,
       is_active = true,
       sort_order = 10
  FROM public.sub_products p
 WHERE sp.product_id = p.id
   AND p.slug = 'canva-pro'
   AND sp.duration_days >= 365;

-- 2. Hide all non-yearly Canva plans (1 Month, 3 Months, 6 Months)
UPDATE public.sub_plans sp
   SET is_active = false
  FROM public.sub_products p
 WHERE sp.product_id = p.id
   AND p.slug = 'canva-pro'
   AND sp.duration_days < 365;

-- 3. Insert 12 Months plan if it doesn't exist yet
INSERT INTO public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
SELECT p.id, '12 Months (Yearly)', 365, 99, 26352, 10, true
FROM public.sub_products p
WHERE p.slug = 'canva-pro'
  AND NOT EXISTS (
    SELECT 1 FROM public.sub_plans sp
    WHERE sp.product_id = p.id AND sp.duration_days >= 365
  );

NOTIFY pgrst, 'reload schema';

COMMIT;
