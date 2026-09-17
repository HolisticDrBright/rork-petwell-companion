-- 0032_food_brand_affiliate.sql
-- Affiliate/retailer plumbing for FOOD brands (the marketplace_candidates.csv
-- rows all ship with affiliate_link empty), plus the 2026-09-17 re-check of
-- three supplement rows in marketplace_products.
--
-- affiliate_program / affiliate_url / affiliate_commission stay NULL here for
-- food brands: the authoritative per-brand program terms live in the Petwell
-- Affiliate Audit doc, which has not been provided to the repo yet — seeding
-- guesses would put unverified commercial claims in production. What CAN be
-- seeded safely is a deterministic retailer fallback link per candidate brand
-- (Chewy search; brand site for DTC-only brands) so every food product has an
-- outbound path, per the commercial-readiness plan ("show the retailer
-- fallback link for every product that lacks a brand program").
-- affiliate_commission is free text on purpose — never parse as numeric.

alter table public.food_brands
  add column if not exists affiliate_program text,
  add column if not exists affiliate_url text,
  add column if not exists affiliate_commission text,
  add column if not exists retailer_fallback_url text;

-- Supplement marketplace rows need the same fallback slot (Nordic below).
alter table public.marketplace_products
  add column if not exists retailer_fallback_url text;

-- Retailer fallbacks for the marketplace-candidate food brands.
update public.food_brands as b
   set retailer_fallback_url = v.url
  from (values
    ('Freshpet', 'https://www.chewy.com/s?query=Freshpet'),
    ('Wellness (WellPet)', 'https://www.chewy.com/s?query=Wellness+pet+food'),
    ('Wellness CORE', 'https://www.chewy.com/s?query=Wellness+CORE'),
    ('Open Farm', 'https://www.chewy.com/s?query=Open+Farm'),
    ('Stella & Chewy''s', 'https://www.chewy.com/s?query=Stella+and+Chewys'),
    ('Natural Balance', 'https://www.chewy.com/s?query=Natural+Balance'),
    ('Orijen', 'https://www.chewy.com/s?query=Orijen'),
    ('Acana', 'https://www.chewy.com/s?query=Acana'),
    ('The Farmer''s Dog', 'https://www.thefarmersdog.com'),
    ('Hill''s Science Diet', 'https://www.chewy.com/s?query=Hills+Science+Diet'),
    ('Hill''s Prescription Diet', 'https://www.chewy.com/s?query=Hills+Prescription+Diet'),
    ('Purina Pro Plan', 'https://www.chewy.com/s?query=Purina+Pro+Plan')
  ) as v(name, url)
 where b.name = v.name and b.retailer_fallback_url is null;

-- 2026-09-17 supplement re-check (marketplace_products):
-- Fera Pets: program runs on Social Snowball — flat $10+/order, 7-day cookie.
update public.marketplace_products
   set affiliate_program = 'Social Snowball (in-house)',
       affiliate_commission = 'flat $10+/order, 7-day cookie',
       source_notes = 'Program re-checked 2026-09-17 (Social Snowball)'
 where slug in ('fera_fish_oil', 'fera_probiotics');

-- Herbsmith: ambassador program discontinued — clear the dead link.
update public.marketplace_products
   set affiliate_program = 'none (ambassador program discontinued)',
       affiliate_url = null,
       affiliate_commission = 'n/a',
       source_notes = 'Program discontinued per 2026-09-17 re-check'
 where slug = 'herbsmith_microflora';

-- Nordic Naturals: no consumer program — fall back to the Chewy listing.
update public.marketplace_products
   set affiliate_program = 'none (no consumer program)',
       affiliate_url = null,
       affiliate_commission = 'n/a',
       retailer_fallback_url = 'https://www.chewy.com/s?query=Nordic+Naturals+Omega-3+Pet',
       source_notes = 'No consumer program per 2026-09-17 re-check; retailer fallback'
 where slug = 'nordic_omega3_pet';
