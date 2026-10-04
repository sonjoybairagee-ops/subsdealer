-- ============================================================
-- Valorant Points (Singapore) — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'valorant');

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
