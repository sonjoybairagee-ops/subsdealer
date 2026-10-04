-- ============================================================
-- Subsdealer - Add PUBG Mobile UC (game top-up)
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ============================================================
-- PUBG Mobile UC — game top-up (direct top-up by Player ID)
--
-- A new "games" category. The customer enters their PUBG Player ID at
-- checkout (delivery_type 'invite' reuses that identifier field) and we
-- top up the account directly — no login, no code to share.
--
-- Each UC pack is a plan. These are one-time top-ups, not subscriptions,
-- so duration_days = 1 is our marker for "instant" (shown as "instant"
-- in the UI, never billed again).
--
-- Cost ~= GamsGo price x 130 BDT/$. UC is a thin-margin, high-repeat
-- product, so no compare_at (a fake slash would just look spammy).
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1. Product
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'pubg-mobile-uc',
    'PUBG Mobile UC',
    'Top up UC straight to your PUBG Mobile account — just give your Player ID.',
    E'Unknown Cash (UC) for PUBG Mobile, topped up directly to your own account. Use it for the Royale Pass, crates, outfits and the in-game shop.\n\nNo login or password needed — you only give us your Player ID and we top up your account directly, usually within minutes of payment.',
    'games',
    'personal',
    'invite',
    'https://www.pubgmobile.com/',
    '["Direct top-up to your own account","No login or password needed","Just your Player ID","Delivery usually within minutes","Use for Royale Pass, crates & shop"]'::jsonb,
    E'After we verify your payment, we top up the Player ID you entered at checkout — usually within minutes.\n\nDouble-check your Player ID before paying: UC is sent straight to that ID and a wrong ID cannot be reversed. You can find your Player ID on your in-game profile.\n\nIf a top-up ever fails on our side, message us and we sort it out.',
    50,
    true
  )
on conflict (slug) do nothing;

-- 2. Thumbnail
update public.sub_products
   set thumbnail_url = '/products/pubg-mobile-uc.png'
 where slug = 'pubg-mobile-uc'
   and (thumbnail_url is null or thumbnail_url = '');

-- 3. Plans — one per UC pack. duration_days = 1 = instant top-up.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('60 UC',          149::numeric, 10),
    ('300 + 25 UC',    699::numeric, 20),
    ('600 + 60 UC',   1399::numeric, 30),
    ('1500 + 300 UC', 3399::numeric, 40),
    ('3000 + 850 UC', 6699::numeric, 50),
    ('6000 + 2100 UC',14999::numeric, 60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'pubg-mobile-uc'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
