-- ============================================================
-- Valorant Points (Malaysia) — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'valorant-my');

insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'valorant-my',
    'Valorant Points (Malaysia)',
    'Direct Riot ID Top-Up for Valorant MY Region.',
    E'Instant Valorant Points (VP) direct to account top-up for Malaysia region accounts.\n\nEnter your Riot ID (Format: Name#TAG) during checkout. Your VP will be added directly to your account within minutes.',
    'games',
    'personal',
    'credential',
    'https://playvalorant.com/',
    '["Direct Riot ID Top-Up","Malaysia Region Accounts","Instant Delivery (2-5 mins)","100% Safe & Official VP"]'::jsonb,
    E'Please ensure your Riot account is registered in the Malaysia region before placing your order.',
    6,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  category = 'games',
  thumbnail_url = '/products/valorant-my.png';

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('475 VP',                           630::numeric,   10),
    ('1000 VP',                         1280::numeric,   20),
    ('2050 VP',                         2490::numeric,   30),
    ('3650 VP',                         4320::numeric,   40),
    ('5350 VP',                         6150::numeric,   50),
    ('11000 VP',                       12300::numeric,   60)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'valorant-my';

notify pgrst, 'reload schema';

commit;
