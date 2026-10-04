-- ============================================================
-- Subdealer - ChatGPT Go product banner
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

-- ============================================================
-- ChatGPT Go — product banner
--
-- ChatGPT Go was added without a thumbnail, so the catalogue card fell
-- back to a plain placeholder. The image lives in public/products/ and
-- is served by the app itself (not hotlinked from a brand CDN).
--
-- Only fills thumbnail_url when it is still empty, so a banner uploaded
-- later through the admin panel is never overwritten.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

update public.sub_products
   set thumbnail_url = '/products/chatgpt-go.png'
 where slug = 'chatgpt-go'
   and (thumbnail_url is null or thumbnail_url = '');

notify pgrst, 'reload schema';

commit;
