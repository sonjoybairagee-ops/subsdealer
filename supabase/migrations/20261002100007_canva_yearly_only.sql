-- ============================================================
-- Canva Pro: one yearly plan at BDT 99
--
-- At BDT 99 a year, the shorter plans stop making sense — a 1-month plan
-- would have to cost about BDT 8 to sit below it, and the 1/3/6-month
-- prices we had (99 / 179 / 279) would all be dearer than a full year.
-- Leaving them live would mean customers paying more for less, so they
-- are retired and Canva becomes a single annual plan.
--
-- Retired, not deleted: subscriptions.plan_id points at these rows, so a
-- delete would break the foreign key and lose the price history of
-- anything already sold on them.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1. Set the yearly price.
update public.sub_plans sp
   set price_bdt = 99,
       name = '12 Months',
       duration_days = 365,
       is_active = true,
       sort_order = 10
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'canva-pro'
   and sp.duration_days >= 365;

-- 2. Hide every shorter Canva plan.
update public.sub_plans sp
   set is_active = false
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'canva-pro'
   and sp.duration_days < 365;

-- 3. If no yearly row existed yet, create one.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, '12 Months', 365, 99, 26352, 10, true
from public.sub_products p
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp
    where sp.product_id = p.id and sp.duration_days >= 365
  );

notify pgrst, 'reload schema';

commit;
