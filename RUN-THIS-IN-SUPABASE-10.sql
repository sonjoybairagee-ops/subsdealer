-- ============================================================
-- Subdealer - Add Duolingo Super (credential / private account)
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ============================================================
-- Duolingo Super — credential (private account) product
--
-- Sourced as a ready-made private account (e.g. from a marketplace at
-- ~$1/mo) and handed to the customer as a login. One account per
-- customer — not a shared pool — so it is delivered as a credential
-- with access_type 'personal'.
--
-- Official Duolingo Super is $12.99/mo or $83.99/yr, so compare_at is
-- anchored to the real list price — the discount shown is genuine.
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
    'duolingo-super',
    'Duolingo Super',
    'Super Duolingo — no ads, unlimited hearts, learn without limits.',
    E'Super Duolingo removes the limits of the free app: no ads, unlimited hearts so a wrong answer never stops you, unlimited Legendary challenges, personalised practice to fix your weak spots, and progress tracking with monthly recaps.\n\nDelivered as a ready-to-use private account login — your own account, not shared with anyone else. Works on the Duolingo app and web with the same login.',
    'education',
    'personal',
    'credential',
    'https://www.duolingo.com',
    '["No ads","Unlimited hearts — mistakes never stop you","Unlimited Legendary challenges","Personalised practice for your weak spots","Mastery & progress tracking","Monthly recap","Works on app and web"]'::jsonb,
    E'Delivered as a private account login — it appears in your dashboard after we verify your payment.\n\nPlease do not change the email or password on the account — that is how we keep it working and replace it if anything goes wrong. If the login ever stops working within your plan period, message us and we replace it.\n\nSign out on devices you are not using.',
    35,
    true
  )
on conflict (slug) do nothing;

-- 2. Thumbnail (image served from public/products/)
update public.sub_products
   set thumbnail_url = '/products/duolingo-super.png'
 where slug = 'duolingo-super'
   and (thumbnail_url is null or thumbnail_url = '');

-- 3. Plans — source cost ~BDT 120-160/mo. compare_at anchored to the
--    official list price ($12.99/mo, $83.99/yr ~ BDT 1,560/mo, 10,080/yr).
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    299::numeric,  1560::numeric, 10),
    ('3 Months',   90,    799::numeric,  4680::numeric, 20),
    ('6 Months',  180,   1499::numeric,  9360::numeric, 30),
    ('12 Months', 365,   2799::numeric, 10080::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'duolingo-super'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
