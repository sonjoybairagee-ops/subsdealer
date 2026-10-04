-- ============================================================
-- Subsdealer - Valorant Points Top Up (Malaysia Region)
-- Pricing optimized against FazerCards Wholesale Cost (USD x ৳130):
--
-- Cost vs Sell Comparison:
--   Package     FazerCards Cost ($x130)   Subsdealer Price   Profit
--   475 VP      $4.30  (৳559)             ৳630               +৳71
--   1000 VP     $8.85  (৳1,151)           ৳1,280             +৳129
--   2050 VP     $17.27 (৳2,245)           ৳2,490             +৳245
--   3650 VP     $30.15 (৳3,920)           ৳4,320             +৳400
--   5350 VP     $43.00 (৳5,590)           ৳6,150             +৳560
--   11000 VP    $86.20 (৳11,206)          ৳12,300            +৳1,094
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old Valorant MY plans if any
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'valorant-my');

-- Insert / Update Valorant Malaysia Product under games category
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'valorant-my',
    'Valorant Points (Malaysia)',
    'Direct Riot ID Top-Up for Valorant MY Region.',
    E'Instant Valorant Points (VP) direct to account top-up for Malaysia region accounts.\n\nEnter your Riot ID (Format: Name#TAG) during checkout. Your VP will be added directly to your account within minutes.',
    'games',
    'personal',
    'credential',
    'https://playvalorant.com/',
    '["Direct Riot ID Top-Up","Malaysia Region Accounts","Instant Delivery (2-5 mins)","100% Safe & Official VP"]'::jsonb,
    E'Please ensure your Riot account is registered in the Malaysia region before placing your order.',
    6,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'games',
  thumbnail_url = '/products/valorant-my.png';

-- Insert Valorant MY VP Plans
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('475 VP',                           630::numeric,   10),
    ('1000 VP',                         1280::numeric,   20),
    ('2050 VP',                         2490::numeric,   30),
    ('3650 VP',                         4320::numeric,   40),
    ('5350 VP',                         6150::numeric,   50),
    ('11000 VP',                       12300::numeric,   60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'valorant-my';

notify pgrst, 'reload schema';

commit;
