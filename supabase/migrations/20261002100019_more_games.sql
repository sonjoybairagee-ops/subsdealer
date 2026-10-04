-- ============================================================
-- Free Fire, Mobile Legends, Genshin Impact — game top-ups
--
-- Same model as PUBG: customer enters their Player ID / UID at checkout
-- (delivery_type 'invite'), we top up directly. Category 'games'.
-- duration_days = 1 marks a one-time / instant top-up.
--
-- PRICES ARE PLACEHOLDERS at BD market ballpark — confirm actual cost on
-- MooGold and adjust. Thin-margin, high-repeat, like PUBG.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ---------- Free Fire ----------
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  ('free-fire', 'Free Fire Diamonds',
   'Top up Free Fire diamonds straight to your account — just your Player ID.',
   E'Diamonds for Free Fire, topped up directly to your own account. Use them for the Elite Pass, bundles, characters and the in-game store.\n\nNo login needed — give us your Player ID and we top up directly, usually within minutes of payment.',
   'games', 'personal', 'invite', 'https://ff.garena.com/',
   '["Direct top-up to your own account","No login or password needed","Just your Player ID","Delivery usually within minutes","For Elite Pass, bundles & store"]'::jsonb,
   E'After we verify your payment, we top up the Player ID you entered at checkout — usually within minutes.\n\nDouble-check your Player ID before paying: diamonds are sent straight to that ID and a wrong ID cannot be reversed.\n\nIf a top-up ever fails on our side, message us and we sort it out.',
   51, true),
  -- ---------- Mobile Legends ----------
  ('mobile-legends', 'Mobile Legends Diamonds',
   'Top up ML diamonds to your account — just your Player ID and Zone.',
   E'Diamonds for Mobile Legends: Bang Bang, topped up directly to your own account. Use them for skins, the Starlight pass, heroes and more.\n\nNo login needed — give us your Player ID and Zone ID and we top up directly, usually within minutes.',
   'games', 'personal', 'invite', 'https://www.mobilelegends.com/',
   '["Direct top-up to your own account","No login or password needed","Player ID + Zone ID","Delivery usually within minutes","For skins, Starlight & heroes"]'::jsonb,
   E'After we verify your payment, we top up the Player ID (and Zone) you entered at checkout — usually within minutes.\n\nEnter your Player ID followed by your Zone, e.g. 12345678 (2001). Double-check before paying — a wrong ID cannot be reversed.\n\nIf a top-up ever fails on our side, message us and we sort it out.',
   52, true),
  -- ---------- Genshin Impact ----------
  ('genshin-impact', 'Genshin Impact Crystals',
   'Top up Genesis Crystals to your account — just your UID and server.',
   E'Genesis Crystals for Genshin Impact, topped up directly to your own account. Convert to Primogems for wishes, or buy the Blessing of the Welkin Moon.\n\nNo login needed — give us your UID and server and we top up directly, usually within minutes.',
   'games', 'personal', 'invite', 'https://genshin.hoyoverse.com/',
   '["Direct top-up to your own account","No login or password needed","Just your UID + server","Delivery usually within minutes","For wishes & Welkin Moon"]'::jsonb,
   E'After we verify your payment, we top up the UID you entered at checkout — usually within minutes.\n\nEnter your UID and tell us your server (America / Europe / Asia / TW-HK-MO) in the WhatsApp message. Double-check your UID — a wrong one cannot be reversed.\n\nIf a top-up ever fails on our side, message us and we sort it out.',
   53, true)
on conflict (slug) do nothing;

-- Thumbnails
update public.sub_products set thumbnail_url = '/products/free-fire.png'
 where slug = 'free-fire' and (thumbnail_url is null or thumbnail_url = '');
update public.sub_products set thumbnail_url = '/products/mobile-legends.png'
 where slug = 'mobile-legends' and (thumbnail_url is null or thumbnail_url = '');
update public.sub_products set thumbnail_url = '/products/genshin-impact.png'
 where slug = 'genshin-impact' and (thumbnail_url is null or thumbnail_url = '');

-- Plans (duration_days = 1 = instant). PLACEHOLDER prices — adjust to MooGold cost.
insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('100 Diamonds',    89::numeric, 10),
    ('310 Diamonds',   250::numeric, 20),
    ('520 Diamonds',   399::numeric, 30),
    ('1060 Diamonds',  779::numeric, 40),
    ('2180 Diamonds', 1549::numeric, 50),
    ('5600 Diamonds', 3799::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'free-fire'
  and not exists (select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name);

insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('86 Diamonds',    119::numeric, 10),
    ('172 Diamonds',   239::numeric, 20),
    ('257 Diamonds',   359::numeric, 30),
    ('514 Diamonds',   699::numeric, 40),
    ('1412 Diamonds', 1899::numeric, 50),
    ('2195 Diamonds', 2899::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'mobile-legends'
  and not exists (select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name);

insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('60 Crystals',        109::numeric, 10),
    ('330 Crystals',       520::numeric, 20),
    ('1090 Crystals',     1599::numeric, 30),
    ('2240 Crystals',     3199::numeric, 40),
    ('3880 Crystals',     5199::numeric, 50),
    ('8080 Crystals',    10499::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'genshin-impact'
  and not exists (select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name);

notify pgrst, 'reload schema';

commit;
