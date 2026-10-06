-- ============================================================
-- Subsdealer - CapCut Pro: Shared (1 Device) & Private Variations
-- 50%+ Profit Margin Pricing Model (Selling Price = ~2x Wholesale Cost)
-- Exchange Rate: $1 USD = ৳132 BDT
--
-- 1. Shared Account (1 Device) [Wholesale: $1.50/mo (~৳198 BDT)]:
--    1 Month  -> ৳399 BDT  (Cost: ৳198 | Profit: ৳201 | 50.3% Margin)
--    3 Months -> ৳1,199 BDT (Cost: ৳594 | Profit: ৳605 | 50.4% Margin)
--    6 Months -> ৳1,799 BDT (Cost: ৳1,188 | Profit: ৳611 | 34.0% Margin)
--
-- 2. Private Account (Full Private) [Wholesale: $2.29/mo (~৳302 BDT)]:
--    1 Month  -> ৳599 BDT  (Cost: ৳302 | Profit: ৳297 | 49.6% Margin)
--    3 Months -> ৳1,799 BDT (Cost: ৳907 | Profit: ৳892 | 49.6% Margin)
--    6 Months -> ৳2,999 BDT (Cost: ৳1,814 | Profit: ৳1,185 | 39.5% Margin)
-- ============================================================

begin;

-- Ensure CapCut Pro Shared Product
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'capcut-pro',
    'CapCut Pro (Shared 1 Device)',
    'The full CapCut toolkit — 1 Device Shared login, 4K export & all effects unlocked.',
    E'CapCut Pro Shared Account (1 Device) removes watermarks and export limits.\n\nIncludes 4K 60fps export, AI Background Remover, Auto Captions, Retouch & Relight. Shared access for 1 active device session.',
    'video',
    'shared',
    'credential',
    'https://www.capcut.com/login',
    '["1 Active Device Session","No watermark on any export","4K 60fps export, no length limit","Full premium effects & transitions","Auto Captions in 30+ languages","AI Background Remover & Retouch","Works on desktop, mobile and web"]'::jsonb,
    E'This is a shared account (1 Device). Please do not change password or email settings.\nSign out on unused devices.',
    20,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  features = EXCLUDED.features;

-- Ensure CapCut Pro Private Product
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'capcut-pro-private',
    'CapCut Pro (Private Account)',
    'Full Private CapCut Pro Account — 100% private login on your email or full private credential.',
    E'CapCut Pro Private Account gives you full private ownership with zero session sharing.\n\nUnlocks all CapCut Pro features, 100GB cloud storage, 4K 60fps export, Auto Captions, and AI tools with 100% private login.',
    'video',
    'personal',
    'credential',
    'https://www.capcut.com/login',
    '["100% Private Account — No Session Sharing","No watermark on any export","4K 60fps export, no length limit","Full premium effects & transitions","Auto Captions in 30+ languages","AI Background Remover & Retouch","100GB Private Cloud Storage","Works on desktop, mobile and web"]'::jsonb,
    E'Full private account access. You are the sole user of this account credential.',
    21,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  features = EXCLUDED.features;

-- Update Plans for CapCut Pro Shared
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'capcut-pro');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   399::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1199::numeric,  7317::numeric, 20),
    ('6 Months',  180,  1799::numeric, 14634::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro';

-- Update Plans for CapCut Pro Private
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'capcut-pro-private');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   599::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1799::numeric,  7317::numeric, 20),
    ('6 Months',  180,  2999::numeric, 14634::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro-private';

notify pgrst, 'reload schema';

commit;
