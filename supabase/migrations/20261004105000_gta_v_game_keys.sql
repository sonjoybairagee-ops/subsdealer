-- ============================================================
-- Grand Theft Auto V (Game Keys) — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'gta-v');

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
