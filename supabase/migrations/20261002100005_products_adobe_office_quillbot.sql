-- ============================================================
-- Adobe Creative Cloud · Microsoft 365 · QuillBot Premium
--
-- Prices set 2 October 2026. Conversions used:
--   1 USD = 123.30 BDT      1 INR = 1.279 BDT
--
-- Official list prices, which is what compare_at_bdt holds:
--   Adobe CC All Apps     $59.99/mo  ~BDT 7,397/mo
--   Microsoft 365 Personal $9.99/mo  ~BDT 1,232/mo  ($99.99/yr)
--   QuillBot Premium      $19.95/mo  ~BDT 2,460/mo  ($99.95/yr)
--
-- Supply cost and resulting margin at these prices:
--   Adobe      BDT   192/month  ->  35-52% margin
--   Office     BDT   384/year   ->  51% margin
--   QuillBot   BDT    64/month  ->  40-57% margin
--
-- Idempotent: safe to re-run, and it will not overwrite prices you
-- have since edited in the admin panel.
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
    'adobe-creative-cloud',
    'Adobe Creative Cloud',
    'All 20+ Adobe apps — Photoshop, Premiere Pro, After Effects and the rest.',
    E'The full Creative Cloud All Apps plan: Photoshop, Illustrator, InDesign, Lightroom, Premiere Pro, After Effects, Audition, Animate and the rest of the suite, plus Adobe Fonts and the generative AI features.\n\nWorks on Windows and macOS. Sign in to the Creative Cloud desktop app with the details we give you and install whichever apps you need.\n\nDelivered as a ready-to-use account login.',
    'design',
    'shared',
    'credential',
    'https://account.adobe.com',
    '["All 20+ Adobe apps in one plan","Photoshop, Illustrator & InDesign","Premiere Pro & After Effects","Lightroom & Lightroom Classic","Adobe Fonts included","Generative AI features","Cloud storage","Windows and macOS"]'::jsonb,
    E'This is a shared account. Please do not change the password, the email, or any account setting — it locks out everyone else and ends your access.\n\nSign out of the Creative Cloud app on machines you are not using. Adobe allows a limited number of active sign-ins and will sign out the oldest when that number is exceeded.\n\nDo not use it for anything that breaches Adobe''s terms — that risks the whole account, not just your seat.',
    5,
    true
  ),
  (
    'microsoft-365',
    'Microsoft 365',
    'Word, Excel, PowerPoint and Outlook, plus 1TB of OneDrive.',
    E'The full desktop Office suite — Word, Excel, PowerPoint, Outlook and OneNote — rather than the limited web versions.\n\nIncludes 1TB of OneDrive storage and the Copilot features in the Office apps. Sign in on up to five devices: Windows, macOS, phones and tablets.\n\nDelivered as a ready-to-use account login, valid for 12 months.',
    'productivity',
    'shared',
    'credential',
    'https://www.office.com',
    '["Word, Excel, PowerPoint, Outlook, OneNote","Full desktop apps, not just the web versions","1TB OneDrive cloud storage","Sign in on up to 5 devices","Windows, macOS, phones and tablets","Copilot features in the Office apps"]'::jsonb,
    E'Sold as a 12-month subscription. Some sellers advertise this as "lifetime" — we do not, because Microsoft bills it yearly and nobody can honestly promise forever on a subscription that renews.\n\nPlease do not change the password, the email, or the recovery details.\n\nIf the account is ever closed, we move you to a replacement for the rest of your term.',
    15,
    true
  ),
  (
    'quillbot-premium',
    'QuillBot Premium',
    'Unlimited paraphrasing, grammar checking and the AI detector.',
    E'QuillBot Premium removes the free tier''s word limits and unlocks every paraphrasing mode, the full grammar and plagiarism checking, the summariser, the citation generator and the AI detector.\n\nUseful for anyone writing a lot in English — students, content writers and anyone drafting client work.\n\nDelivered as a ready-to-use account login.',
    'productivity',
    'shared',
    'credential',
    'https://quillbot.com/login',
    '["Unlimited paraphrasing, no word cap","All paraphrasing modes unlocked","Advanced grammar checker","Plagiarism checking","AI detector","Summariser & citation generator","Faster processing"]'::jsonb,
    E'This is a shared account. Please do not change the password or the email address.\n\nQuillBot limits how many sessions can be active at once, so sign out when you are finished rather than leaving it logged in everywhere.',
    25,
    true
  )
on conflict (slug) do nothing;

-- ------------------------------------------------------------
-- Plans
-- ------------------------------------------------------------

-- Adobe Creative Cloud — official BDT 7,397/month.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   400::numeric,  7397::numeric, 10),
    ('3 Months',   90,  1150::numeric, 22191::numeric, 20),
    ('6 Months',  180,  2200::numeric, 44382::numeric, 30),
    ('12 Months', 365,  3600::numeric, 88764::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'adobe-creative-cloud'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- Microsoft 365 — official BDT 1,232/month, and the supply is bought by the
-- year, so a one-month sale would still burn a whole year of stock. Annual only.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('12 Months', 365, 799::numeric, 14784::numeric, 10)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'microsoft-365'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- QuillBot Premium — official BDT 2,460/month. Monthly only.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month', 30, 149::numeric, 2460::numeric, 10)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'quillbot-premium'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

-- If an earlier run of this file created the longer QuillBot plans, retire
-- them. Hidden rather than deleted, so any subscription already sold on one
-- of them keeps its price history and its foreign key.
update public.sub_plans sp
   set is_active = false
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'quillbot-premium'
   and sp.duration_days > 30;

-- ------------------------------------------------------------
-- Teams
--
-- These three are bought as individual accounts rather than big shared
-- panels, so a team here is a filing cabinet, not a seat limit. The real
-- limit is max_users on each credential — set that to 1 when an account is
-- meant for one customer.
-- ------------------------------------------------------------
insert into public.sub_teams (product_id, name, capacity, login_url, notes, is_active)
select p.id, v.name, v.capacity, v.login_url, v.notes, true
from public.sub_products p
cross join (values
    ('adobe-creative-cloud', 'Adobe Pool #01',    100, 'https://account.adobe.com',
     'Accounts bought per customer. Set max_users = 1 on each credential unless you have verified the account tolerates sharing. Buy price ~BDT 192/month.'),
    ('microsoft-365',        'Microsoft Pool #01', 100, 'https://www.office.com',
     'Bought by the year at ~BDT 384. Sold as 12 months only, so one purchase covers one customer for one term.'),
    ('quillbot-premium',     'QuillBot Pool #01',  100, 'https://quillbot.com/login',
     'Buy price ~BDT 64/month. QuillBot limits concurrent sessions, so keep max_users low on each credential.')
  ) as v(slug, name, capacity, login_url, notes)
where p.slug = v.slug
  and not exists (
    select 1 from public.sub_teams st
    where st.product_id = p.id and lower(st.name) = lower(v.name)
  );

notify pgrst, 'reload schema';

commit;
