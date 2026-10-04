-- ============================================================
-- Delta Force (Global) — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'delta-force');

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
