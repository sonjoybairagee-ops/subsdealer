-- ============================================================
-- Farlight 84 Diamonds — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'farlight-84');

insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'farlight-84',
    'Farlight 84 Diamonds',
    'Direct Player UID Top-Up for Farlight 84.',
    E'Instant Farlight 84 Diamonds direct to account top-up.\n\nEnter your Farlight 84 User ID (Player UID) during checkout. Your Diamonds will be added directly to your account within minutes.',
    'games',
    'personal',
    'credential',
    'https://farlight84.farlightgames.com/',
    '["Direct Player UID Top-Up","Global & BD Server","Instant Delivery (2-5 mins)","100% Safe & Official Diamonds"]'::jsonb,
    E'Please double check your Farlight 84 User ID before placing the order.',
    7,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'games',
  thumbnail_url = '/products/farlight-84.png';

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('10 Diamonds',                      14::numeric,    15::numeric,   10),
    ('20 Diamonds',                      24::numeric,    25::numeric,   20),
    ('30 Diamonds',                      38::numeric,    40::numeric,   30),
    ('40 Diamonds',                      52::numeric,    55::numeric,   40),
    ('50 Diamonds',                      62::numeric,    65::numeric,   50),
    ('60 Diamonds',                      76::numeric,    80::numeric,   60),
    ('80 Diamonds',                     100::numeric,   105::numeric,   70),
    ('100 Diamonds',                    124::numeric,   130::numeric,   80),
    ('165 Diamonds',                    192::numeric,   200::numeric,   90),
    ('220 Diamonds',                    270::numeric,   285::numeric,  100),
    ('330 Diamonds',                    365::numeric,   380::numeric,  110),
    ('880 Diamonds',                    970::numeric,  1010::numeric,  120),
    ('2240 Diamonds',                  2520::numeric,  2600::numeric,  130),
    ('4700 Diamonds',                  5050::numeric,  5200::numeric,  140)
  ) as v(name, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'farlight-84';

notify pgrst, 'reload schema';

commit;
