-- ============================================================
-- Subsdealer - Canva Pro Plan Cleanup & Deduplication
--
-- Fixes duplicate plan cards by:
-- 1. Deactivating ALL existing plans for 'canva-pro'.
-- 2. Deduplicating and reactivating EXACTLY ONE plan for 30 days (৳0 Free Claim)
--    and EXACTLY ONE plan for 365 days (৳99 12-Month Offer).
--
-- Paste this script into the Supabase SQL Editor and click Run.
-- ============================================================

begin;

-- 1. Ensure Canva Pro product exists & active
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'canva-pro',
    'Canva Pro',
    'Design anything, publish anywhere. Team invite directly to your own account.',
    E'Canva Pro invite delivered directly to your own account email. Keep your designs, brand kits, fonts, and assets private — no shared passwords, no shared folders.\n\nChoose 1 Month Free Claim (Facebook Offer) or 12 Months for just ৳99.',
    'design',
    'personal',
    'invite',
    'https://www.canva.com',
    '["100M+ premium photos, videos, audio & graphics","100+ Brand Kits with colors & fonts","Magic Studio AI tools (Magic Write, Eraser, Expand)","1TB Cloud storage for all your designs","Invite sent directly to your own account email","100% private — your designs stay your own"]'::jsonb,
    E'We send a Canva Pro team invite to your account email address. Accept it from your inbox and premium features turn on instantly.',
    1,
    true
  )
on conflict (slug) do update set
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  thumbnail_url = '/products/canva-pro.png',
  is_active = true;

-- 2. Deactivate ALL plans for Canva Pro first
update public.sub_plans
   set is_active = false
 where product_id in (select id from public.sub_products where slug = 'canva-pro');

-- 3. Update the FIRST matching plan for 30 days (Free Claim), or insert if none exists
with p as (
  select id from public.sub_products where slug = 'canva-pro' limit 1
),
existing_30 as (
  select sp.id 
    from public.sub_plans sp
    join p on sp.product_id = p.id
   where sp.duration_days = 30
   order by sp.created_at asc
   limit 1
)
update public.sub_plans
   set name           = '1 Month (Free Claim)',
       price_bdt      = 0,
       compare_at_bdt = 2196,
       sort_order     = 10,
       is_active      = true
 where id in (select id from existing_30);

-- If no 30-day plan existed to update, insert one
insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, '1 Month (Free Claim)', 30, 0, 2196, 10, true
from public.sub_products p
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.duration_days = 30 and sp.is_active = true
  );

-- 4. Update the FIRST matching plan for 365 days (12 Months ৳99), or insert if none exists
with p as (
  select id from public.sub_products where slug = 'canva-pro' limit 1
),
existing_365 as (
  select sp.id 
    from public.sub_plans sp
    join p on sp.product_id = p.id
   where sp.duration_days = 365
   order by sp.created_at asc
   limit 1
)
update public.sub_plans
   set name           = '12 Months (Yearly)',
       price_bdt      = 99,
       compare_at_bdt = 26352,
       sort_order     = 20,
       is_active      = true
 where id in (select id from existing_365);

-- If no 365-day plan existed to update, insert one
insert into public.sub_plans (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, '12 Months (Yearly)', 365, 99, 26352, 20, true
from public.sub_products p
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.duration_days = 365 and sp.is_active = true
  );

notify pgrst, 'reload schema';

commit;
