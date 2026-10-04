-- ============================================================
-- Subsdealer - Mobile Legends: reprice to TRUE cost (USD x 130)
--
-- Correction: a reseller's real cost is the USD price x the Binance
-- funding rate (৳130), NOT MooGold's displayed BDT price (which uses
-- MooGold's own ~৳123 rate and understates the real cost).
--
-- Cheaper source per pack (small packs: FazerCards; big packs: MooGold):
--   Pack           USD cost   x130 cost   Sell     Profit
--   78+8   (86)    $1.15      ৳150        179      ~29
--   156+16 (172)   $2.29      ৳298        359      ~61
--   234+23 (257)   $3.31      ৳430        519      ~89
--   633+83 (716)   $11.80     ৳1,534      1,749    ~215
--   1860+335(2195) $28.17     ৳3,662      3,999    ~337
--   3099+589(3688) $46.99     ৳6,109      6,599    ~490
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- 1. Retire all current ML plans (including RUN-18's packs).
update public.sub_plans sp
   set is_active = false
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'mobile-legends';

-- 2. Insert the corrected packs.
insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('78 + 8 Diamonds',      179::numeric, 10),
    ('156 + 16 Diamonds',    359::numeric, 20),
    ('234 + 23 Diamonds',    519::numeric, 30),
    ('633 + 83 Diamonds',   1749::numeric, 40),
    ('1860 + 335 Diamonds', 3999::numeric, 50),
    ('3099 + 589 Diamonds', 6599::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'mobile-legends'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- 3. On re-run, make sure these names carry the right price + are active.
update public.sub_plans sp
   set price_bdt = v.price_bdt, is_active = true, sort_order = v.sort_order
  from public.sub_products p,
       (values
          ('78 + 8 Diamonds',      179::numeric, 10),
          ('156 + 16 Diamonds',    359::numeric, 20),
          ('234 + 23 Diamonds',    519::numeric, 30),
          ('633 + 83 Diamonds',   1749::numeric, 40),
          ('1860 + 335 Diamonds', 3999::numeric, 50),
          ('3099 + 589 Diamonds', 6599::numeric, 60)
       ) as v(name, price_bdt, sort_order)
 where sp.product_id = p.id
   and p.slug = 'mobile-legends'
   and sp.name = v.name;

notify pgrst, 'reload schema';

commit;
