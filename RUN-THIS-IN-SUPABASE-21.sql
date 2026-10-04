-- ============================================================
-- Subsdealer - Free Fire (BD Server)
-- Pricing optimized against FazerCards USD cost (USD x ৳130),
-- RMT Game Shop rates, and Jubaly rates for maximum competitiveness & profit.
--
-- Cost vs Sell Comparison:
--   Pack                 FazerCards Cost ($x130)   RMT Sell   Jubaly Sell   Subsdealer Price   Profit
--   25 Diamonds          $0.15 (৳19.50)           ৳25        ৳25           ৳25                +৳5.50
--   50 Diamonds          $0.28 (৳36.40)           ৳50        ৳35           ৳45                +৳8.60
--   115 Diamonds         $0.60 (৳78.00)           ৳82        ৳80           ৳80                +৳2.00
--   240 Diamonds         $1.21 (৳157.30)          ৳162       ৳158          ৳160               +৳2.70
--   610 Diamonds         $3.04 (৳395.20)          ৳410       ৳400          ৳405               +৳9.80
--   1240 Diamonds        $6.05 (৳786.50)          ৳815       ৳800          ৳810               +৳23.50
--   2530 Diamonds        $12.07 (৳1569.10)        ৳1635      ৳1610         ৳1620              +৳50.90
--   Weekly Lite          $0.34 (৳44.20)           ৳50        ৳40           ৳45                +৳0.80
--   Weekly Membership    $1.21 (৳157.30)          ৳162       ৳158          ৳160               +৳2.70
--   Monthly Membership   $6.04 (৳785.20)          ৳805       ৳790          ৳800               +৳14.80
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old Free Fire plans
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'free-fire');

-- Ensure Free Fire product exists with exact BD Server details
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'free-fire',
    'Free Fire (BD Server)',
    'Direct Diamond & Pass top-up via Player UID.',
    E'Free Fire Diamonds, Weekly Membership, and Monthly Membership for Bangladesh Server.\n\nEnter your Player UID at checkout — direct instant top-up within minutes. No password needed.',
    'games',
    'personal',
    'invite',
    'https://ff.garena.com/',
    '["Direct top-up to Bangladesh Server","No password needed","Just Player UID","Instant 2-5 min delivery","Official Garena Diamonds & Passes"]'::jsonb,
    E'Double-check your Player UID before paying. Top-up goes straight to the UID entered at checkout.',
    20,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  thumbnail_url = '/products/free-fire.png';

-- Insert optimized Free Fire plans & passes
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('25 Diamonds',        25::numeric, 10),
    ('50 Diamonds',        45::numeric, 20),
    ('115 Diamonds',       80::numeric, 30),
    ('240 Diamonds',      160::numeric, 40),
    ('610 Diamonds',      405::numeric, 50),
    ('1240 Diamonds',     810::numeric, 60),
    ('2530 Diamonds',    1620::numeric, 70),
    ('Weekly Lite',        45::numeric, 80),
    ('Weekly Membership', 160::numeric, 90),
    ('Monthly Membership',800::numeric, 100)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'free-fire';

notify pgrst, 'reload schema';

commit;
