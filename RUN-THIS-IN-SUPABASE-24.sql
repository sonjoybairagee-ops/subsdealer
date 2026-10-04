-- ============================================================
-- Subsdealer - Red Dead Redemption 2 (Game Keys)
-- Pricing optimized against FazerCards Wholesale Cost (USD x ৳130):
--
-- Cost vs Sell Comparison:
--   Edition                                       FazerCards Cost ($x130)   Subsdealer Price   Profit
--   Red Dead Redemption 2 (Standard Rockstar Key)  $13.166 (৳1,712)          ৳1,830             +৳118
--   Red Dead Redemption 2 Ultimate Edition        $17.632 (৳2,292)          ৳2,430             +৳138
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old RDR2 plans if any
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'rdr2');

-- Insert / Update Red Dead Redemption 2 Product under game_keys category
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'rdr2',
    'Red Dead Redemption 2',
    'Official Rockstar Activation Key (Global Region).',
    E'Red Dead Redemption 2 for PC (Rockstar Games Launcher).\n\nGet your 100% official digital code directly upon payment verification. Redeem on Rockstar Games Launcher and play immediately.',
    'game_keys',
    'personal',
    'credential',
    'https://socialclub.rockstargames.com/',
    '["Official Rockstar Activation Key","Global Region - Works in Bangladesh","PC Full Game Access","Instant digital code delivery"]'::jsonb,
    E'Digital keys are non-refundable once redeemed. Activate on your Rockstar Games account via socialclub.rockstargames.com.',
    6,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'game_keys',
  thumbnail_url = '/products/rdr2.png';

-- Insert RDR2 Plans
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('Standard Edition (Rockstar Key)',                         1830::numeric, 10),
    ('Ultimate Edition (Rockstar Key)',                         2430::numeric, 20)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'rdr2';

notify pgrst, 'reload schema';

commit;
