-- ============================================================
-- Subsdealer - Grand Theft Auto V (Game Keys)
-- Pricing optimized against FazerCards Wholesale Cost (USD x ৳130):
--
-- Cost vs Sell Comparison:
--   Edition                                       FazerCards Cost ($x130)   Subsdealer Price   Profit
--   Grand Theft Auto V (Standard Rockstar Key)    $9.898 (৳1,287)           ৳1,390             +৳103
--   Grand Theft Auto V Enhanced & Great White     $13.685 (৳1,779)          ৳1,890             +৳111
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

-- Delete old GTA V plans if any
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'gta-v');

-- Insert / Update Grand Theft Auto V Product under game_keys category
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'gta-v',
    'Grand Theft Auto V',
    'Official Rockstar Activation Key (Global Region).',
    E'Grand Theft Auto V for PC (Rockstar Games Launcher).\n\nGet your 100% official digital code directly upon payment verification. Redeem on Rockstar Games Launcher and play immediately.',
    'game_keys',
    'personal',
    'credential',
    'https://socialclub.rockstargames.com/',
    '["Official Rockstar Activation Key","Global Region - Works in Bangladesh","PC Full Game Access","Instant digital code delivery"]'::jsonb,
    E'Digital keys are non-refundable once redeemed. Activate on your Rockstar Games account via socialclub.rockstargames.com.',
    5,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'game_keys',
  thumbnail_url = '/products/gta-v.png';

-- Insert GTA V Plans
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('Standard Edition (Rockstar Key)',                         1390::numeric, 10),
    ('Enhanced & Great White Shark Card (Rockstar Key)',         1890::numeric, 20)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'gta-v';

notify pgrst, 'reload schema';

commit;
