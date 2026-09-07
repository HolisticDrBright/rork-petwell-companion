-- 0026_marketplace_affiliate.sql
-- Marketplace: brand + affiliate/practitioner metadata columns
-- (applied to the research database 2026-09-07 as
-- `marketplace_products_brand_affiliate_columns`; ported verbatim).
--
-- affiliate_commission is free text on purpose — values like
-- "up to 30%, 30-day cookie", "not published", "n/a". Never parse as numeric.

alter table public.marketplace_products
  add column if not exists brand text,
  add column if not exists product_url text,
  add column if not exists affiliate_program text,
  add column if not exists affiliate_url text,
  add column if not exists affiliate_commission text,
  add column if not exists nasc_seal boolean,
  add column if not exists source_notes text,
  add column if not exists evidence_status public.evidence_status default 'admin_reviewed';

-- The pre-existing "(example)" rows are demo fixtures: demo mode only.
update public.marketplace_products
   set evidence_status = 'demo_seed'
 where evidence_status is null or name ilike '%(example)%';
