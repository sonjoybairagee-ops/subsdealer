-- ============================================================
-- Mobile Legends: Bang Bang (Global) — RMT Game Shop rates
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'mobile-legends');

insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'mobile-legends',
    'Mobile Legends: Bang Bang (Global)',
    'Direct Diamond & Pass top-up via User ID & Zone ID.',
    E'Mobile Legends: Bang Bang Diamonds & Event Passes topped up directly to your account.\n\nProvide your User ID and Zone ID at checkout — no password needed. Instant 2-5 min delivery.',
    'games',
    'personal',
    'invite',
    'https://m.mobilelegends.com/',
    '["Direct top-up by User ID & Zone ID","No password needed","Instant 2-5 min delivery","Official Global diamonds & passes"]'::jsonb,
    E'Make sure to enter your correct User ID and Zone ID (found on your in-game profile page).',
    10,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  thumbnail_url = '/products/mobile-legends.png';

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('5 Diamonds',                                 15::numeric, 10),
    ('10 Diamonds',                                15::numeric, 15),
    ('11 Diamonds',                                30::numeric, 20),
    ('20 Diamonds',                                30::numeric, 25),
    ('22 Diamonds',                                55::numeric, 30),
    ('40 Diamonds',                                55::numeric, 35),
    ('55 Diamonds (50 + 5 Bonus)',               110::numeric, 40),
    ('86 Diamonds (78 + 8 Bonus)',               170::numeric, 45),
    ('100 Diamonds (30 + 50 Bonus)',             110::numeric, 50),
    ('110 Diamonds (100 + 10 Bonus)',            215::numeric, 55),
    ('172 Diamonds (156 + 16 Bonus)',            335::numeric, 60),
    ('257 Diamonds (234 + 23 Bonus)',            480::numeric, 65),
    ('275 Diamonds (250 + 25 Bonus)',            510::numeric, 70),
    ('300 Diamonds (150 + 150 Bonus)',           320::numeric, 75),
    ('343 Diamonds (311 + 32 Bonus)',            665::numeric, 80),
    ('429 Diamonds (390 + 39 Bonus)',            810::numeric, 85),
    ('500 Diamonds (250 + 250 Bonus)',           510::numeric, 90),
    ('514 Diamonds (468 + 46 Bonus)',            955::numeric, 95),
    ('565 Diamonds (500 + 65 Bonus)',           1050::numeric, 100),
    ('600 Diamonds (546 + 54 Bonus)',           1125::numeric, 105),
    ('706 Diamonds (625 + 81 Bonus)',           1310::numeric, 110),
    ('878 Diamonds (781 + 97 Bonus)',           1645::numeric, 115),
    ('1000 Diamonds (500 + 500 Bonus)',         1050::numeric, 120),
    ('1050 Diamonds (937 + 113 Bonus)',         1970::numeric, 125),
    ('1130 Diamonds (1000 + 130 Bonus)',        2090::numeric, 130),
    ('1584 Diamonds (1406 + 178 Bonus)',        2960::numeric, 135),
    ('2195 Diamonds (1860 + 335 Bonus)',        3960::numeric, 140),
    ('3688 Diamonds (3099 + 589 Bonus)',        6590::numeric, 145),
    ('5532 Diamonds (4649 + 883 Bonus)',        9950::numeric, 150),
    ('9288 Diamonds (7740 + 1548 Bonus)',      16550::numeric, 155),
    ('Weekly Diamond Pass',                      205::numeric, 160),
    ('Weekly Elite bundle',                      110::numeric, 165),
    ('2 Weekly Pass + 55 Diamonds',              520::numeric, 170),
    ('Monthly Epic Bundle',                      480::numeric, 175),
    ('Super Value Pass',                         110::numeric, 180),
    ('Twilight Pass',                           1080::numeric, 185)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'mobile-legends';

notify pgrst, 'reload schema';

commit;
