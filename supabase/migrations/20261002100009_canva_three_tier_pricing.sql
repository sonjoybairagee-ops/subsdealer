-- ============================================================
-- Canva Pro: a three-step price ladder (1 / 6 / 12 months)
--
-- The single BDT 99 yearly plan left nothing to upsell and no room to
-- discount, so Canva goes back to a ladder — but a ladder with real gaps
-- between the rungs, which is what the old 99 / 179 / 279 / 399 set never
-- had (a year cost four times a month, so nobody had a reason to commit).
--
--   1 Month    BDT  59   = BDT 59/mo
--   6 Months   BDT 249   = BDT 42/mo   — 30% off the monthly rate
--   12 Months  BDT 399   = BDT 33/mo   — 44% off the monthly rate
--
-- compare_at stays anchored to Canva's official BDT 2,196/month rather
-- than an invented "cut price", so the discount shown on the site is a
-- real one and survives a customer checking canva.com.
--
-- 3 Months is retired: with six months at 249 it had no room left between
-- the rungs, and a four-option picker made the choice harder, not better.
--
-- Retired, not deleted: subscriptions.plan_id points at these rows, so a
-- delete would break the foreign key and lose the price history of
-- anything already sold on them.
--
-- Idempotent: safe to re-run.
-- ============================================================

begin;

-- 1. Re-price (and re-activate) the three plans we keep.
update public.sub_plans sp
   set name           = v.name,
       price_bdt      = v.price_bdt,
       compare_at_bdt = v.compare_at_bdt,
       sort_order     = v.sort_order,
       is_active      = true
  from public.sub_products p,
       (values
          ( 30, '1 Month',    59::numeric,  2196::numeric, 10),
          (180, '6 Months',  249::numeric, 13176::numeric, 20),
          (365, '12 Months', 399::numeric, 26352::numeric, 30)
       ) as v(duration_days, name, price_bdt, compare_at_bdt, sort_order)
 where sp.product_id = p.id
   and p.slug = 'canva-pro'
   and sp.duration_days = v.duration_days;

-- 2. Hide any other Canva plan (the old 3-month row, and anything stale).
update public.sub_plans sp
   set is_active = false
  from public.sub_products p
 where sp.product_id = p.id
   and p.slug = 'canva-pro'
   and sp.duration_days not in (30, 180, 365);

-- 3. Create whichever of the three does not exist yet.
insert into public.sub_plans
  (product_id, name, duration_days, price_bdt, compare_at_bdt, sort_order, is_active)
select p.id, v.name, v.duration_days, v.price_bdt, v.compare_at_bdt, v.sort_order, true
from public.sub_products p
cross join (values
    ('1 Month',    30,    59::numeric,  2196::numeric, 10),
    ('6 Months',  180,   249::numeric, 13176::numeric, 20),
    ('12 Months', 365,   399::numeric, 26352::numeric, 30)
  ) as v(name, duration_days, price_bdt, compare_at_bdt, sort_order)
where p.slug = 'canva-pro'
  and not exists (
    select 1 from public.sub_plans sp
    where sp.product_id = p.id and sp.duration_days = v.duration_days
  );

notify pgrst, 'reload schema';

commit;
