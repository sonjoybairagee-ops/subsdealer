-- ============================================================
-- Leonardo AI (Essential) — credential (private account) product
--
-- Sourced as a ready-made private account with the Essential plan
-- (8,500 tokens/mo) and handed to the customer as a login. One account
-- per customer, so delivered as a credential with access_type 'personal'.
--
-- Official Leonardo Essential is $12/mo (or $10/mo billed annually), so
-- compare_at is anchored to the real list price.
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
    'leonardo-ai',
    'Leonardo AI',
    'AI image generation — 8,500 tokens a month, no watermark, your images are yours.',
    E'Leonardo AI turns text prompts into high-quality images and art. The Essential plan gives you 8,500 tokens a month for generating images and video, private generation mode, full ownership of what you create, no watermarks, and the full feature set including LoRA training.\n\nDelivered as a ready-to-use private account login — your own account, not shared with anyone else. Works in the browser.',
    'ai',
    'personal',
    'credential',
    'https://app.leonardo.ai/',
    '["8,500 tokens every month","High-quality AI image generation","No watermark on downloads","Private generation mode","Full ownership of your images","LoRA training included","Full access to all features"]'::jsonb,
    E'Delivered as a private account login — it appears in your dashboard after we verify your payment.\n\nPlease do not change the email or password on the account — that is how we keep it working and replace it if anything goes wrong. If the login ever stops working within your plan period, message us and we replace it (1:1 replacement).\n\nSign out on devices you are not using.',
    40,
    true
  )
on conflict (slug) do nothing;

-- 2. Thumbnail
update public.sub_products
   set thumbnail_url = '/products/leonardo-ai.png'
 where slug = 'leonardo-ai'
   and (thumbnail_url is null or thumbnail_url = '');

-- 3. Plans — source cost ~BDT 240/mo. compare_at anchored to the official
--    list price ($12/mo, ~BDT 1,440/mo; $120/yr, ~BDT 14,400/yr).
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    599::numeric,  1440::numeric, 10),
    ('3 Months',   90,   1599::numeric,  4320::numeric, 20),
    ('6 Months',  180,   2999::numeric,  8640::numeric, 30),
    ('12 Months', 365,   5499::numeric, 14400::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'leonardo-ai'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
