-- ============================================================
-- Subsdealer - Mobile Legends: reprice to MooGold cost
--
-- Pack names aligned to MooGold so fulfilment is 1:1 (buy the same pack
-- on MooGold). Placeholder plans retired, real packs inserted.
--
--   MooGold pack    Cost ৳     Sell ৳    Profit
--   78+8    (86)    147        169       ~22
--   254+30  (284)   580        669       ~89
--   383+46  (429)   870        979       ~109
--   633+83  (716)   1,450      1,599     ~149
--   1860+335(2195)  3,462      3,749     ~287
--   3099+589(3688)  5,775      6,149     ~374
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- 1. Retire the old placeholder ML plans.
update public.sub_plans sp
   set is_active = false
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'mobile-legends';

-- 2. Insert the real packs (reactivate + fix price if a name already exists).
insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('78 + 8 Diamonds',      169::numeric, 10),
    ('254 + 30 Diamonds',    669::numeric, 20),
    ('383 + 46 Diamonds',    979::numeric, 30),
    ('633 + 83 Diamonds',   1599::numeric, 40),
    ('1860 + 335 Diamonds', 3749::numeric, 50),
    ('3099 + 589 Diamonds', 6149::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'mobile-legends'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- 3. If a re-run already had these names, make sure price + active are right.
update public.sub_plans sp
   set price_bdt = v.price_bdt, is_active = true, sort_order = v.sort_order
  from public.sub_products p,
       (values
          ('78 + 8 Diamonds',      169::numeric, 10),
          ('254 + 30 Diamonds',    669::numeric, 20),
          ('383 + 46 Diamonds',    979::numeric, 30),
          ('633 + 83 Diamonds',   1599::numeric, 40),
          ('1860 + 335 Diamonds', 3749::numeric, 50),
          ('3099 + 589 Diamonds', 6149::numeric, 60)
       ) as v(name, price_bdt, sort_order)
 where sp.product_id = p.id
   and p.slug = 'mobile-legends'
   and sp.name = v.name;

notify pgrst, 'reload schema';

commit;
