-- ============================================================
-- Subdealer — starting catalogue
--
-- Prices in BDT, set against official list prices in October 2026
-- (1 USD = 123.3 BDT, 1 INR = 1.279 BDT):
--
--   Canva Pro     $18.00/mo  official ~BDT 2,196/mo
--   CapCut Pro    $19.99/mo  official ~BDT 2,439/mo
--   ChatGPT Plus  $20.00/mo  official ~BDT 2,440/mo
--
-- compare_at_bdt holds that official figure, so the discount badge on the
-- site is computed from a real number rather than an invented "was" price.
--
-- Canva is priced against the local market, not against cost: an invite
-- costs nothing to supply, local sellers go as low as BDT 49/year, and
-- competing down there attracts the most support-hungry, least loyal
-- customers. BDT 399 sits above the throwaway tier and below the
-- BDT 599-850 mid tier.
--
-- INSERT ... WHERE NOT EXISTS / ON CONFLICT DO NOTHING on purpose: re-running
-- this never overwrites a price you have since edited in the admin panel.
--
-- Credentials are NOT seeded — passwords have to be encrypted by the
-- application, so add those under /admin/credentials.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
insert into public.sub_products
  (slug, name, tagline, description, category, access_type, delivery_type,
   login_url, features, terms_note, sort_order, is_active)
values
  (
    'canva-pro',
    'Canva Pro',
    'Premium Canva on your own account — we send the invite, your files stay yours.',
    E'Canva premium unlocks the paid library: millions of stock photos, videos and graphics, the premium template collection, Background Remover, Magic Resize, Brand Kit and 1TB of storage.\n\nThis is delivered as a team invite, not a shared login. You give us the email address of your own Canva account, we send an invite to it, and you accept from your inbox. You keep your own account, your own password and all your designs — the premium features simply switch on.\n\nBecause it is your account, nobody else can see your work and you never share a password with anyone.',
    'design',
    'shared',
    'invite',
    'https://www.canva.com/login',
    '["Premium stock photos, videos & audio","Premium template library","Background Remover & Magic Eraser","Magic Resize for every social size","Brand Kit — your fonts, colours & logos","1TB cloud storage","Your own account — your designs stay private","No shared password"]'::jsonb,
    E'How it works: after payment, give us the email you use for Canva. We send a team invite to it — accept it from your inbox and premium turns on. Check your spam folder if you do not see it.\n\nPlease stay in the team. Leaving it, or being removed, ends your premium access. Do not change the team settings or remove other members.\n\nIf the team is ever closed down, we move you to another one and send a fresh invite — your designs are in your own account and are never affected.',
    10,
    true
  ),
  (
    'capcut-pro',
    'CapCut Pro',
    'The full CapCut toolkit — no watermark, 4K export, every effect unlocked.',
    E'CapCut Pro removes the watermark and the export limits, and unlocks the part of the library that actually saves time: premium effects and transitions, the full sound and sticker packs, and the AI tools.\n\nAuto Captions, Background Remover, Retouch, Relight and Upscale all come included, plus 4K 60fps export and 100GB of cloud space. Works on desktop and mobile with the same login.\n\nDelivered as a ready-to-use Pro account login.',
    'video',
    'shared',
    'credential',
    'https://www.capcut.com/login',
    '["No watermark on any export","4K 60fps export, no length limit","Full premium effects & transitions library","Auto Captions in 30+ languages","AI Background Remover & Retouch","AI Upscale and Relight","Premium sound, sticker & text packs","100GB cloud storage","Works on desktop, mobile and web"]'::jsonb,
    E'This is a shared account. Please do not change the password, the email, or any account setting — it locks out everyone else on the account and ends your access.\n\nSign out on devices you are not using. Too many simultaneous sessions can get the account flagged.',
    20,
    true
  ),
  (
    'chatgpt-plus',
    'ChatGPT Plus',
    'Frontier model access, faster replies and the full tool set — at local pricing.',
    E'ChatGPT Plus gives you the frontier models instead of the free tier''s limits: far higher message caps, priority access when the service is busy, and first access to new features.\n\nIncludes file and image uploads, Advanced Data Analysis, image generation, web browsing, Voice Mode, and custom GPTs.\n\nDelivered as a ready-to-use Plus account login. No international card needed.',
    'ai',
    'shared',
    'credential',
    'https://chatgpt.com/auth/login',
    '["Access to the latest GPT models","Much higher message limits than Free","Priority access during peak hours","File & image uploads","Advanced Data Analysis","Image generation","Web browsing & Deep Research","Advanced Voice Mode","Custom GPTs"]'::jsonb,
    E'This is a shared account. Please do not change the password, the email, or enable two-factor authentication — any of those lock out everyone on the account, including you.\n\nOpenAI signs out older sessions when too many people are active at once. If you get signed out, wait a few minutes and log back in with the same details.\n\nDo not use it for anything that breaches OpenAI''s usage policies — that gets the whole account banned, not just one user.',
    30,
    true
  )
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Plans
-- ------------------------------------------------------------

-- Canva Pro — official BDT 2,196/month. Priced to the local market.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    99::numeric,  2196::numeric, 10),
    ('3 Months',   90,   179::numeric,  6588::numeric, 20),
    ('6 Months',  180,   279::numeric, 13176::numeric, 30),
    ('12 Months', 365,   399::numeric, 26352::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- CapCut Pro — official BDT 2,439/month.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   399::numeric,  2439::numeric, 10),
    ('3 Months',   90,  1099::numeric,  7317::numeric, 20),
    ('6 Months',  180,  2099::numeric, 14634::numeric, 30),
    ('12 Months', 365,  3999::numeric, 29268::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'capcut-pro'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- ChatGPT Plus — official BDT 2,440/month.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   999::numeric,  2440::numeric, 10),
    ('3 Months',   90,  2799::numeric,  7320::numeric, 20),
    ('6 Months',  180,  5299::numeric, 14640::numeric, 30),
    ('12 Months', 365,  9999::numeric, 29280::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'chatgpt-plus'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- ------------------------------------------------------------
-- Starter teams
--
-- Capacity is deliberately far below what each panel technically allows.
-- A Canva panel holds hundreds, but putting every customer on one means a
-- single shutdown takes out all of them. 50 keeps the blast radius small
-- and spare panels cost almost nothing.
-- ------------------------------------------------------------
insert into public.sub_teams (product_id, name, capacity, login_url, notes, is_active)
select p.id, v.name, v.capacity, v.login_url, v.notes, true
from public.sub_products p
cross join (values
    ('canva-pro',    'Canva Team #01',   50, 'https://www.canva.com/login',
     'Invite-based. Keep each panel at 50 members so one shutdown affects 50 customers, not all of them. Always keep two spare panels bought and idle.'),
    ('capcut-pro',   'CapCut Team #01',   8, 'https://www.capcut.com/login',
     'Accounts bought per customer last 28-30 days. At 8 members a BDT 22,000/year account is ~BDT 229/member/month. Watch for simultaneous-session limits.'),
    ('chatgpt-plus', 'ChatGPT Team #01',  4, 'https://chatgpt.com/auth/login',
     'About BDT 2,440/month per account. At 4 members that is ~BDT 610/member/month. Do not go much above 4 — OpenAI signs out concurrent sessions.')
  ) as v(slug, name, capacity, login_url, notes)
where p.slug = v.slug
  and not exists (
    select 1 from public.sub_teams st
    where st.product_id = p.id and lower(st.name) = lower(v.name)
  );

commit;
