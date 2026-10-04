-- ============================================================
-- Subdealer - ChatGPT Go & Plus: clarify managed flow in terms
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ============================================================
-- ChatGPT Go & Plus — clarify the managed flow in the terms
--
-- Decision: we do NOT store customer passwords. Checkout collects only
-- the account email (the existing 'invite' flow). After payment is
-- approved, the customer sends their password over WhatsApp, we log in,
-- subscribe with our card, immediately cancel auto-renew (the plan still
-- runs the full term), log out, and tell them to change their password.
--
-- This migration only updates description + terms_note text so the
-- customer understands the flow. No schema or price changes.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- ChatGPT Go
update public.sub_products
   set terms_note = E'How it works:\n1) After payment, give us the email of your own ChatGPT account at checkout (make a free one at chatgpt.com if you do not have one).\n2) Once we confirm your payment, we message you on WhatsApp and you send your account password there — never type it on this site.\n3) We log in, switch on the Go plan with our international card, and immediately turn off auto-renew, so nothing is ever charged to us again. Your plan still runs the full term you paid for.\n4) We log out and tell you it is live. You can change your password right away — the plan stays active.\n\nThe plan does NOT auto-renew. When your term ends it simply drops back to the free tier — your account and chats are never affected. To continue, just place a new order.'
 where slug = 'chatgpt-go';

-- ChatGPT Plus
update public.sub_products
   set terms_note = E'How it works:\n1) After payment, give us the email of your own ChatGPT account at checkout (make a free one at chatgpt.com if you do not have one).\n2) Once we confirm your payment, we message you on WhatsApp and you send your account password there — never type it on this site.\n3) We log in, switch on Plus with our international card, and immediately turn off auto-renew, so nothing is ever charged to us again. Your plan still runs the full term you paid for.\n4) We log out and tell you it is live. You can change your password right away — the plan stays active.\n\nThe plan does NOT auto-renew. When your term ends it simply drops back to the free tier — your account and chats are never affected. To continue, just place a new order.'
 where slug = 'chatgpt-plus';

notify pgrst, 'reload schema';

commit;
