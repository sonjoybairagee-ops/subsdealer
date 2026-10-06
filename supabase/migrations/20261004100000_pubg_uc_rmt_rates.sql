-- ============================================================
-- PUBG Mobile UC — Synchronize with RMT Game Shop rates
-- ============================================================

begin;

-- Remove old / outdated PUBG UC plans
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'pubg-mobile-uc');

-- Insert RMT Game Shop exact PUBG UC plans & Royale Pass packages
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('60 UC',               1, 120::numeric, 10),
    ('325 UC',              1, 640::numeric, 20),
    ('660 UC',             1, 1280::numeric, 30),
    ('1800 UC',            1, 3200::numeric, 40),
    ('3850 UC',            1, 6390::numeric, 50),
    ('8100 UC',           1, 12780::numeric, 60),
    ('Elite Pass (LV 50)',  30, 720::numeric, 70),
    ('Elite Pass (LV 100)', 30, 1460::numeric, 80),
    ('Elite Pass Plus 100', 30, 3590::numeric, 90),
    ('Prime (1 Month)',     30, 120::numeric, 100),
    ('Prime Plus (1 Month)',30, 970::numeric, 110)
  ) as v(name, duration_days, price_bdt, sort_order)
where p.slug = 'pubg-mobile-uc';

notify pgrst, 'reload schema';

commit;
