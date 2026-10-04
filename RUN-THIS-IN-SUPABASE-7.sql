-- ============================================================
-- Subdealer - Convert ChatGPT Plus to managed model + reprice
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ============================================================
-- ChatGPT Plus → managed activation on the customer's own account
--
-- The old ChatGPT Plus was a shared login (one account split across
-- several people), which OpenAI flags and bans. This converts it to
-- the same clean model as ChatGPT Go and Canva: the customer gives us
-- the email of their OWN ChatGPT account, we activate Plus on it with
-- our international card, and they keep sole use of their own account
-- and password. One account = one person.
--
--   access_type  : shared      -> personal
--   delivery_type: credential  -> invite   (checkout collects the
--                                            customer's own account email)
--
-- Cost is ~$23/mo incl. VAT at ~BDT 129/$ = ~BDT 2,967/mo, so prices
-- sit just above cost. compare_at left NULL (no fake discount).
--
-- Pricing and history preserved: plan rows are updated in place, not
-- deleted, so subscriptions.plan_id stays valid.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1. Convert the product to the managed (personal / invite) model.
update public.sub_products
   set access_type   = 'personal',
       delivery_type = 'invite',
       tagline     = 'ChatGPT Plus on your own account — we activate it, you keep your login.',
       description = E'ChatGPT Plus unlocks the frontier models and the full tool set: advanced intelligence for complex work, higher-quality image creation, the Work agent, Codex for coding, expanded memory with 20GB storage, email & calendar connections, and no ads.\n\nThis is activated on your OWN ChatGPT account — not a shared login. After payment you give us the email of your ChatGPT account, and we switch on Plus for it using our international card. You keep your own account, your own password and all your chat history.\n\nNo international card needed on your side, and you are the only person using the account — so there is nothing to share and nothing to get flagged.',
       features = '["Advanced intelligence for complex work","Latest frontier GPT models","Higher-quality image creation","Work agent to act across apps & files","Codex to automate coding","Expanded memory & 20GB storage","Email & calendar connections","No ads","Your own account — your chats stay private"]'::jsonb,
       terms_note = E'How it works: after payment, give us the email of your own ChatGPT account (or make a free one first at chatgpt.com). We activate Plus on it and confirm when it is live — usually within a few hours.\n\nBecause it is your own account, only you use it. Keep your login details private. You can change your password after activation without affecting the plan.\n\nAt renewal time we top up the same account again. If you do not renew, the plan simply lapses back to the free tier — your account and chat history are never affected.'
 where slug = 'chatgpt-plus';

-- 2. Re-price the plans above cost (~BDT 2,967/mo). Update in place.
update public.sub_plans sp
   set price_bdt      = v.price_bdt,
       compare_at_bdt = null,
       is_active      = true
  from public.sub_products p,
       (values
          ( 30, '1 Month',     3299::numeric),
          ( 90, '3 Months',    9499::numeric),
          (180, '6 Months',   18499::numeric),
          (365, '12 Months',  35999::numeric)
       ) as v(duration_days, name, price_bdt)
 where sp.product_id = p.id
   and p.slug = 'chatgpt-plus'
   and sp.duration_days = v.duration_days;

-- 3. Create any of the four plans that do not exist yet.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, null, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,   3299::numeric, 10),
    ('3 Months',   90,   9499::numeric, 20),
    ('6 Months',  180,  18499::numeric, 30),
    ('12 Months', 365,  35999::numeric, 40)
  ) as v(name, duration_days, price_bdt, sort_order)
where p.slug = 'chatgpt-plus'
  and not exists (
    select 1 from public.sub_plans sp
    where sp.product_id = p.id and sp.duration_days = v.duration_days
  );

notify pgrst, 'reload schema';

commit;
