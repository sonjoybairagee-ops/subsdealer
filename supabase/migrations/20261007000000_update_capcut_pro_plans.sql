-- ============================================================
-- Subsdealer - CapCut Pro: Update Plans & Pricing
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'capcut-pro');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   499::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1299::numeric,  7317::numeric, 20),
    ('6 Months',  180,  2299::numeric, 14634::numeric, 30),
    ('12 Months', 365,  3999::numeric, 29268::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro';

notify pgrst, 'reload schema';

commit;
