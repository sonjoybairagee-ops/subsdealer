-- ============================================================
-- Free Fire (BD Server) — Pricing sync
-- ============================================================

begin;

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'free-fire');

insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'free-fire',
    'Free Fire (BD Server)',
    'Direct Diamond & Pass top-up via Player UID.',
    E'Free Fire Diamonds, Weekly Membership, and Monthly Membership for Bangladesh Server.\n\nEnter your Player UID at checkout — direct instant top-up within minutes. No password needed.',
    'games',
    'personal',
    'invite',
    'https://ff.garena.com/',
    '["Direct top-up to Bangladesh Server","No password needed","Just Player UID","Instant 2-5 min delivery","Official Garena Diamonds & Passes"]'::jsonb,
    E'Double-check your Player UID before paying. Top-up goes straight to the UID entered at checkout.',
    20,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  thumbnail_url = '/products/free-fire.png';

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, 1, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('25 Diamonds',        25::numeric, 10),
    ('50 Diamonds',        45::numeric, 20),
    ('115 Diamonds',       80::numeric, 30),
    ('240 Diamonds',      160::numeric, 40),
    ('610 Diamonds',      405::numeric, 50),
    ('1240 Diamonds',     810::numeric, 60),
    ('2530 Diamonds',    1620::numeric, 70),
    ('Weekly Lite',        45::numeric, 80),
    ('Weekly Membership', 160::numeric, 90),
    ('Monthly Membership',800::numeric, 100)
  ) as v(name, price_bdt, sort_order)
where p.slug = 'free-fire';

notify pgrst, 'reload schema';

commit;
