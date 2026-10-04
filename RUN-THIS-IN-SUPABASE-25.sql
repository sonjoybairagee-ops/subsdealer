-- ============================================================
-- Subsdealer - Valorant Points Top Up (Singapore Region)
-- Pricing optimized against FazerCards Wholesale Cost (USD x ৳130) vs Jubaly:
--
-- Cost vs Sell Comparison:
--   Package     FazerCards Cost ($x130)   Jubaly Price   Subsdealer Price   Profit
--   475 VP      $5.08  (৳660)             ৳760           ৳730               +৳70
--   1000 VP     $10.16 (৳1,321)           ৳1,520         ৳1,460             +৳139
--   2050 VP     $19.61 (৳2,549)           ৳2,935         ৳2,820             +৳271
--   3650 VP     $34.14 (৳4,438)           ৳5,115         ৳4,920             +৳482
--   5350 VP     $48.68 (৳6,328)           ৳7,290         ৳6,990             +৳662
--   11000 VP    $98.09 (৳12,752)          ৳14,690        ৳13,990            +৳1,238
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old Valorant plans if any
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'valorant');

-- Insert / Update Valorant Product under games category
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'valorant',
    'Valorant Points (Singapore)',
    'Direct Riot ID Top-Up for Valorant SG Region.',
    E'Instant Valorant Points (VP) direct to account top-up for Singapore region accounts.\n\nEnter your Riot ID (Format: Name#TAG) during checkout. Your VP will be added directly to your account within minutes.',
    'games',
    'personal',
    'credential',
    'https://playvalorant.com/',
    '["Direct Riot ID Top-Up","Singapore Region Accounts","Instant Delivery (2-5 mins)","100% Safe & Official VP"]'::jsonb,
    E'Please ensure your Riot account is registered in the Singapore region before placing your order.',
    5,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'games',
  thumbnail_url = '/products/valorant.png';

-- Insert Valorant VP Plans
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('475 VP',                           730::numeric,   760::numeric,   10),
    ('1000 VP',                         1460::numeric,  1520::numeric,   20),
    ('2050 VP',                         2820::numeric,  2935::numeric,   30),
    ('3650 VP',                         4920::numeric,  5115::numeric,   40),
    ('5350 VP',                         6990::numeric,  7290::numeric,   50),
    ('11000 VP',                       13990::numeric, 14690::numeric,   60)
  ) as v(name, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'valorant';

notify pgrst, 'reload schema';

commit;
