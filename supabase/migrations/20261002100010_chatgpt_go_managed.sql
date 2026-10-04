-- ============================================================
-- ChatGPT Go — managed activation on the customer's own account
--
-- This is NOT a shared login. The customer gives us the email of
-- their own ChatGPT account at checkout, we activate the Go plan on
-- it using our international card, and they keep sole use of their
-- own account and password. One account = one person, so nothing is
-- shared and OpenAI's one-person rule is respected.
--
-- Modelled exactly like Canva Pro: access_type = 'personal',
-- delivery_type = 'invite'. The 'invite' delivery path is what makes
-- the checkout collect the customer's own account email (invite_email)
-- and keeps it out of the shared-credential pool.
--
-- Official ChatGPT Go is ~$5.75/mo incl. VAT (~BDT 700). The value we
-- add is local payment (bKash) and no international card — so prices
-- sit just above cost with a thin, honest margin, not a fake discount.
-- compare_at is left NULL on purpose: Go is already cheap and inventing
-- a cut price would be dishonest.
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
    'chatgpt-go',
    'ChatGPT Go',
    'ChatGPT Go on your own account — we activate it, you keep your login.',
    E'ChatGPT Go gives you much higher limits than the free tier: around 10x the messages, image generations and file uploads, plus expanded memory, voice and the latest GPT models.\n\nThis is activated on your OWN ChatGPT account — not a shared login. After payment you give us the email of your ChatGPT account, and we switch on the Go plan for it using our international card. You keep your own account, your own password and all your chat history.\n\nNo international card needed on your side, and you are the only person using the account — so there is nothing to share and nothing to get flagged.',
    'ai',
    'personal',
    'invite',
    'https://chatgpt.com/auth/login',
    '["~10x higher message limits than Free","Latest GPT models","More image generations, faster","Larger file & image uploads","Expanded memory & context","Voice mode","Your own account — your chats stay private","No shared password, no international card needed"]'::jsonb,
    E'How it works: after payment, give us the email of your own ChatGPT account (or make a free one first at chatgpt.com). We activate the Go plan on it and confirm when it is live — usually within a few hours.\n\nBecause it is your own account, only you use it. Keep your login details private. If you ever want to, you can change your password after activation without affecting the plan.\n\nAt renewal time we top up the same account again. If you do not renew, the plan simply lapses back to the free tier — your account and chat history are never affected.',
    25,
    true
  )
on conflict (slug) do nothing;

-- 2. Plans — cost is ~BDT 700/mo, so margin is thin and roughly flat
--    across durations (our cost is linear, so long plans are not much
--    cheaper per month). Adjust freely later.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    849::numeric, null::numeric, 10),
    ('3 Months',   90,   2399::numeric, null::numeric, 20),
    ('6 Months',  180,   4699::numeric, null::numeric, 30),
    ('12 Months', 365,   8999::numeric, null::numeric, 40)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'chatgpt-go'
  and not exists (
    select 1 from public.sub_plans sp where sp.product_id = p.id and sp.name = v.name
  );

notify pgrst, 'reload schema';

commit;
