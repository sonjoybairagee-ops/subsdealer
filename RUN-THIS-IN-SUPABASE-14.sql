-- ============================================================
-- Subsdealer - Windows 11 Pro price -> BDT 549
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

update public.sub_plans sp
   set price_bdt = 549
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'windows-11'
   and sp.name = 'Pro — Lifetime';

notify pgrst, 'reload schema';

commit;
