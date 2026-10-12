-- ============================================================
-- Subsdealer - Adobe Creative Cloud Product & Plans
-- Pricing Model: Based on wholesale cost with margin
-- Exchange Rate: $1 USD = ৳123.3 BDT
--
-- Adobe Creative Cloud (All Apps) - Wholesale ~$20/mo
-- 1 Month  -> ৳2,499 BDT (Cost: ৳2,466  | Profit: ৳33   | 1.3% Margin)
-- 3 Months -> ৳7,499 BDT (Cost: ৳7,398  | Profit: ৳101  | 1.4% Margin)
-- 4 Months -> ৳9,999 BDT (Cost: ৳9,864  | Profit: ৳135  | 1.4% Margin)
-- ============================================================

begin;

-- Ensure Adobe Creative Cloud Product
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'adobe-creative-cloud',
    'Adobe Creative Cloud (All Apps)',
    'Full Adobe Creative Cloud suite — Photoshop, Illustrator, Premiere Pro & 20+ creative apps.',
    E'Adobe Creative Cloud All Apps gives you access to the complete collection of creative desktop and mobile apps.\n\nIncludes Photoshop, Illustrator, InDesign, Premiere Pro, After Effects, Lightroom, Acrobat Pro, and 20+ more apps. 100GB cloud storage, Adobe Fonts, and portfolio tools included.',
    'design',
    'personal',
    'credential',
    'https://www.adobe.com/creativecloud/catalog/desktop.html',
    '["Access to 20+ Creative Apps (Photoshop, Illustrator, Premiere Pro, etc.)","100GB Cloud Storage","Adobe Fonts Included","Portfolio Website Builder","Creative Cloud Libraries","Works on desktop and mobile","Latest updates and new features"]'::jsonb,
    E'Full Adobe Creative Cloud access. Login credentials will be assigned after purchase. Do not change password or email settings.',
    25,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- Update Plans for Adobe Creative Cloud
delete from public.sub_plans
 where product_id in (select id from public.sub_products where slug = 'adobe-creative-cloud');

insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   2499::numeric,  14994::numeric, 10),
    ('3 Months',   90,   7499::numeric,  44982::numeric, 20),
    ('4 Months',  120,   9999::numeric,  59976::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'adobe-creative-cloud';

notify pgrst, 'reload schema';

commit;
