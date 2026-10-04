-- ============================================================
-- Subsdealer - PUBG Mobile UC: reprice to MooGold cost
--
-- Source moved to MooGold (cheaper than GamsGo, especially on big
-- packs). Prices set just above MooGold member cost and competitive
-- with local sellers (Jubaly). UC is thin-margin, high-repeat.
--
--   Pack            MooGold cost   New price   Profit
--   60 UC           ~114           139         ~25
--   300 + 25 UC     ~572           649         ~77
--   600 + 60 UC     ~1,143         1,289       ~146
--   1500 + 300 UC   ~2,860         3,149       ~289
--   3000 + 850 UC   ~5,720         6,199       ~479
--   6000 + 2100 UC  ~11,440        12,499      ~1,059
--
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once.
-- ============================================================

begin;

update public.sub_plans sp
   set price_bdt = v.price_bdt
  from public.sub_products p,
       (values
          ('60 UC',           139::numeric),
          ('300 + 25 UC',     649::numeric),
          ('600 + 60 UC',    1289::numeric),
          ('1500 + 300 UC',  3149::numeric),
          ('3000 + 850 UC',  6199::numeric),
          ('6000 + 2100 UC',12499::numeric)
       ) as v(name, price_bdt)
 where sp.product_id = p.id
   and p.slug = 'pubg-mobile-uc'
   and sp.name = v.name;

notify pgrst, 'reload schema';

commit;
