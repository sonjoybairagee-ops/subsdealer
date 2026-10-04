-- ============================================================
-- Subsdealer - Delta Force (Global)
-- Pricing optimized against FazerCards USD cost (USD x ৳130)
-- and RMT Game Shop rates for maximum competitiveness & profit.
--
-- Cost vs Sell Comparison:
--   Pack                         FazerCards Cost ($x130)   RMT Sell   Subsdealer Price   Profit
--   18 Delta Coins               $0.23 (৳29.90)           ৳33        ৳33                +৳3.10
--   30 Delta Coins               $0.39 (৳50.70)           ৳55        ৳55                +৳4.30
--   60 Delta Coins               $0.77 (৳100.10)          ৳110       ৳108               +৳7.90
--   320 Delta Coins              $3.90 (৳507.00)          ৳550       ৳545               +৳38.00
--   460 Delta Coins              $5.65 (৳734.50)          ৳800       ৳790               +৳55.50
--   750 Delta Coins              $7.79 (৳1012.70)         ৳1100      ৳1090              +৳77.30
--   1480 Delta Coins             $15.58 (৳2025.40)        ৳2195      ৳2180              +৳154.60
--   1980 Delta Coins             $19.48 (৳2532.40)        ৳2750      ৳2730              +৳197.60
--   3950 Delta Coins             $38.96 (৳5064.80)        ৳5490      ৳5450              +৳385.20
--   8100 Delta Coins             $77.90 (৳10127.00)       ৳10970     ৳10890             +৳763.00
--   Reorientation Supplies       (৳55.00)                 ৳70        ৳68                +৳13.00
--   Season Pass Warfare Special  $4.24 (৳551.20)          ৳595       ৳590               +৳38.80
--   Season Pass Operations       $4.24 (৳551.20)          ৳595       ৳590               +৳38.80
--   Season Pass Deluxe           $5.88 (৳764.40)          ৳825       ৳820               +৳55.60
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old Delta Force plans if any
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'delta-force');

-- Ensure Delta Force product exists
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'delta-force',
    'Delta Force',
    'Direct Delta Coins & Season Pass top-up via Player ID.',
    E'Delta Force Global is a team-based tactical shooter. Top up Delta Coins and Season Passes directly to your account.\n\nEnter your Player ID at checkout — fast 5-30 minute delivery. No password needed.',
    'games',
    'personal',
    'invite',
    'https://www.playdeltaforce.com/',
    '["Direct top-up via Player ID","No password needed","Fast 5-30 min delivery","Official Global Coins & Passes"]'::jsonb,
    E'Double-check your Player ID before paying. Coins and Passes are credited directly to your Player ID.',
    30,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  thumbnail_url = '/products/delta-force.png';

-- Insert Delta Force plans & passes
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('18 Delta Coins',                             33::numeric, 10),
    ('30 Delta Coins',                             55::numeric, 20),
    ('60 Delta Coins',                            108::numeric, 30),
    ('320 Delta Coins',                           545::numeric, 40),
    ('460 Delta Coins',                           790::numeric, 50),
    ('750 Delta Coins',                          1090::numeric, 60),
    ('1480 Delta Coins',                         2180::numeric, 70),
    ('1980 Delta Coins',                         2730::numeric, 80),
    ('3950 Delta Coins',                         5450::numeric, 90),
    ('8100 Delta Coins',                        10890::numeric, 100),
    ('Reorientation Supplies',                     68::numeric, 110),
    ('Season Pass Warfare Special',               590::numeric, 120),
    ('Season Pass Operations Special',            590::numeric, 130),
    ('Season Pass Delta Force Deluxe',            820::numeric, 140)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'delta-force';

notify pgrst, 'reload schema';

commit;
