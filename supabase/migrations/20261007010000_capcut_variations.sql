-- ============================================================
-- Subsdealer - CapCut Pro: Shared (1 Device) & Private Variations
-- ============================================================

begin;

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

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'capcut-pro');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   399::numeric,  2439::numeric, 10),
    ('3 Months',   90,   999::numeric,  7317::numeric, 20),
    ('6 Months',  180,  1899::numeric, 14634::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro';

delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'capcut-pro-private');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   549::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1399::numeric,  7317::numeric, 20),
    ('6 Months',  180,  2599::numeric, 14634::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro-private';

notify pgrst, 'reload schema';

commit;
