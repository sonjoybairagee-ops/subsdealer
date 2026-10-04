-- ============================================================
-- ChatGPT Plus (Shared) — budget tier, shared slot
--
-- Sourced from a group-buy platform as a shared Plus slot and handed to
-- the customer as a login. This is NOT the managed "your own account"
-- Plus — it is a shared account, cheaper but less stable, and the risk
-- is stated plainly in the terms and shown at checkout (access_type
-- 'shared' triggers the shared-account warning + confirmation tickbox).
--
-- Cost ~$7/mo (GamsGo) ~ BDT 874/mo at ~125/$.
-- compare_at anchored to official ChatGPT Plus ($20/mo ~ BDT 2,500).
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
    'chatgpt-plus-shared',
    'ChatGPT Plus (Shared)',
    'ChatGPT Plus at a budget price — a shared account. Cheaper, but read the rules.',
    E'ChatGPT Plus gives you the frontier models, higher message limits, priority access, file and image uploads, image generation and the full tool set.\n\nThis is the BUDGET option: a SHARED Plus account, not your own. It costs a fraction of a private plan, but because the account is shared you must follow the rules below or access can be interrupted. If you want your own account that never gets flagged, choose our managed "ChatGPT Plus" instead.\n\nDelivered as a ready-to-use login.',
    'ai',
    'shared',
    'credential',
    'https://chatgpt.com/auth/login',
    '["Access to the frontier GPT models","Much higher limits than Free","File & image uploads","Image generation","Web browsing","Works on web, mobile and desktop","Budget price — shared account"]'::jsonb,
    E'Please read before buying — this is a SHARED account:\n\n• Do not change the email or password, and do not enable two-factor/verification. Any of these lock out everyone on the account, including you, and end your access.\n• OpenAI signs out older sessions when too many people are active at once. If you get signed out, wait a few minutes and log back in with the same details.\n• Codex is not guaranteed on a shared account.\n• Do not use it in any way that breaks OpenAI''s policies — that can get the whole account suspended.\n\nIf the account stops working within your plan period, message us and we replace it. For a private account that only you use and never gets flagged, choose our managed "ChatGPT Plus" instead.',
    32,
    true
  )
on conflict (slug) do nothing;

-- 2. Thumbnail
update public.sub_products
   set thumbnail_url = '/products/chatgpt-plus-shared.png'
 where slug = 'chatgpt-plus-shared'
   and (thumbnail_url is null or thumbnail_url = '');

-- 3. Plans — 1 / 3 / 6 month. compare_at = official Plus ($20/mo).
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',   30,  1199::numeric,  2500::numeric, 10),
    ('3 Months',  90,  2999::numeric,  7500::numeric, 20),
    ('6 Months', 180,  5499::numeric, 15000::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'chatgpt-plus-shared'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
