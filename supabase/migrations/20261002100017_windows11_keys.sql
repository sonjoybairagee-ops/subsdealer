-- ============================================================
-- Windows 11 (Pro / Home) — lifetime activation key
--
-- A one-time license key, not a subscription. Sourced cheaply (~$2.80)
-- and delivered as a 25-digit activation key. Modelled as a credential
-- product: the admin stores the key in a credential row and it appears
-- in the customer's dashboard after approval.
--
-- Honest framing: these are genuine activation keys, not "retail" boxes.
-- They activate and stay activated; if a key is ever blocked we replace
-- it within the plan period. No fake "official retail" claims.
--
-- "Lifetime" is modelled as 3650 days (the schema's max duration).
-- compare_at left NULL on purpose — a huge % off would look like the
-- spam key-sellers; the value (lifetime, cheap) is clear on its own.
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
    'windows-11',
    'Windows 11 Key',
    'Genuine Windows 11 activation key — lifetime, instant delivery.',
    E'A genuine Windows 11 activation key. Activate once and your Windows stays activated — you get Microsoft updates and the full Windows 11 experience, 32/64-bit, all languages.\n\nChoose Home or Pro. Delivered as a 25-digit key with a short activation guide, instantly after we verify your payment.\n\nThis is an activation key, not a retail box. It activates your own Windows install and stays active.',
    'software',
    'personal',
    'credential',
    'https://www.microsoft.com/software-download/windows11',
    '["Genuine 25-digit activation key","Lifetime activation — pay once","Full Microsoft updates","32-bit & 64-bit, all languages","Works worldwide","Instant delivery after payment","Activation guide included"]'::jsonb,
    E'You receive a 25-digit Windows 11 activation key with a short guide — it appears in your dashboard after we verify your payment.\n\nActivate it on your own PC (Settings > System > Activation). Keep the key private and do not share it — a key used on another machine can be blocked.\n\nIf the key is ever blocked within your plan period, message us and we replace it. This is an activation key, not a Microsoft retail box, and we do not claim otherwise.',
    45,
    true
  )
on conflict (slug) do nothing;

-- 2. Thumbnail
update public.sub_products
   set thumbnail_url = '/products/windows-11.png'
 where slug = 'windows-11'
   and (thumbnail_url is null or thumbnail_url = '');

-- 3. Plans — two lifetime options (Home / Pro). 3650 days = "lifetime".
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('Home — Lifetime', 3650, 499::numeric, null::numeric, 10),
    ('Pro — Lifetime',  3650, 549::numeric, null::numeric, 20)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'windows-11'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
