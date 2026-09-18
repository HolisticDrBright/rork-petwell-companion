-- 0035 — Merge duplicate food brands, and queue the per-lot COA sources for review.
--
-- WHY THE MERGE MATTERS (it is not cosmetic):
-- The Open Pet Food Facts import created a separate brand row for every spelling
-- of a brand name — "Purina", "purina" and "PURINA" are three rows splitting 414
-- products between them. 272 such clusters cover 3,523 products.
--
-- Everything brand-level is keyed on brand_id, so a split brand silently breaks:
--   * Per-pet recall alerts. A recall attached to "Purina" never matches a pet
--     fed a product whose brand_id points at "purina". The owner is not warned.
--   * Affiliate and retailer links, which were set on one variant only.
--   * Brand search and the food UI, which show the same brand several times.
--
-- WHAT MERGES: only clusters whose names are identical after lowercasing and
-- removing non-alphanumerics (curly apostrophes normalised to straight first).
-- So "Hill's" / "Hills" / "Hill’s" merge, and "Stella & Chewy's" (stellachewys)
-- does NOT merge with "Stella and Chewy's" (stellaandchewys) — different words,
-- a human decision, left for the review queue.
--
-- The surviving row is the one with the most products; ties are broken toward a
-- properly capitalised name, then the longer name, then the oldest row. Metadata
-- the losers hold (manufacturer, country, affiliate + retailer links) is coalesced
-- onto the survivor so nothing is lost.
--
-- food_brands has no foreign keys pointing at it, so every brand_id column is
-- repointed explicitly. All six are listed here; a missed one would orphan rows.

begin;

create table if not exists private.brand_merge_map_0035 (
  loser_id uuid primary key,
  winner_id uuid not null,
  norm_key text not null,
  loser_name text not null,
  winner_name text not null
);
truncate private.brand_merge_map_0035;

insert into private.brand_merge_map_0035 (loser_id, winner_id, norm_key, loser_name, winner_name)
with norm as (
  select b.id,
         b.name,
         b.created_at,
         regexp_replace(lower(translate(b.name, '’‘`´', '''''''')), '[^a-z0-9]+', '', 'g') as k,
         (select count(*) from public.food_products p where p.brand_id = b.id) as products
  from public.food_brands b
),
dups as (
  select k from norm where k <> '' group by k having count(*) > 1
),
ranked as (
  select n.*,
         row_number() over (
           partition by n.k
           order by n.products desc,
                    -- prefer a name that is neither all-lower nor all-upper
                    (case when n.name <> lower(n.name) and n.name <> upper(n.name) then 0 else 1 end),
                    length(n.name) desc,
                    n.created_at asc,
                    n.id asc
         ) as rn
  from norm n
  join dups d on d.k = n.k
),
winners as (select k, id, name from ranked where rn = 1)
select r.id, w.id, r.k, r.name, w.name
from ranked r
join winners w on w.k = r.k
where r.rn > 1;

-- Keep any metadata only a losing row carried.
update public.food_brands w
set manufacturer = coalesce(w.manufacturer, src.manufacturer),
    country = coalesce(w.country, src.country),
    affiliate_program = coalesce(w.affiliate_program, src.affiliate_program),
    affiliate_url = coalesce(w.affiliate_url, src.affiliate_url),
    affiliate_commission = coalesce(w.affiliate_commission, src.affiliate_commission),
    retailer_fallback_url = coalesce(w.retailer_fallback_url, src.retailer_fallback_url)
from (
  select m.winner_id,
         (array_agg(b.manufacturer) filter (where b.manufacturer is not null))[1] as manufacturer,
         (array_agg(b.country) filter (where b.country is not null))[1] as country,
         (array_agg(b.affiliate_program) filter (where b.affiliate_program is not null))[1] as affiliate_program,
         (array_agg(b.affiliate_url) filter (where b.affiliate_url is not null))[1] as affiliate_url,
         (array_agg(b.affiliate_commission) filter (where b.affiliate_commission is not null))[1] as affiliate_commission,
         (array_agg(b.retailer_fallback_url) filter (where b.retailer_fallback_url is not null))[1] as retailer_fallback_url
  from private.brand_merge_map_0035 m
  join public.food_brands b on b.id = m.loser_id
  group by m.winner_id
) src
where w.id = src.winner_id;

-- manufacturer_quality_profiles is UNIQUE(brand_id): drop a loser's profile when
-- the survivor already has one, otherwise the repoint below would collide.
delete from public.manufacturer_quality_profiles p
using private.brand_merge_map_0035 m
where p.brand_id = m.loser_id
  and exists (select 1 from public.manufacturer_quality_profiles q where q.brand_id = m.winner_id);

-- Repoint every brand_id column in the schema.
update public.food_products t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;
update public.recall_events t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;
update public.lab_tests t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;
update public.contaminant_tests t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;
update public.evidence_links t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;
update public.manufacturer_quality_profiles t set brand_id = m.winner_id
  from private.brand_merge_map_0035 m where t.brand_id = m.loser_id;

-- Record what was merged before the rows disappear, so the change is auditable.
insert into public.admin_review_actions (admin_id, entity_type, entity_id, action, details)
select '00000000-0000-0000-0000-000000000000'::uuid,
       'brand_merge',
       m.winner_id,
       'merge',
       jsonb_build_object(
         'migration', '0035',
         'kept', m.winner_name,
         'merged', m.loser_name,
         'merged_id', m.loser_id,
         'reason', 'identical brand name after case/punctuation normalisation'
       )
from private.brand_merge_map_0035 m;

delete from public.food_brands b
using private.brand_merge_map_0035 m
where b.id = m.loser_id;

drop table private.brand_merge_map_0035;

-- ── Per-lot COA sources: queue for a human to verify and record ──────────────
-- These four brands publish real per-lot or per-product test results. Each needs
-- a person to open the page, pull a genuine lot report, and record the values —
-- exactly the evidence the app currently has to say "no public product-level COA
-- found" about. The URLs were captured on 2026-06-25 and could NOT be re-verified
-- when this migration was written (the build environment has no egress to these
-- hosts), so confirming the link still works is part of the review.
insert into public.admin_review_queue (entity_type, entity_id, priority, status, note)
select 'lab_test', b.id, q.priority, 'open', q.note
from (values
  ('Open Farm', 30,
   'COA source — per-lot QC results. https://openfarmpet.com/pages/transparency ' ||
   'Enter a bag lot code to trace ingredients and download that run''s QC lab results ' ||
   '(salmonella / E. coli / mycotoxin clearance). TO DO: pull one real lot report, record ' ||
   'the lab, test date and results against the product, and grade it. Verify the URL first — ' ||
   'it was last confirmed 2026-06-25.'),
  ('Stella & Chewy''s', 30,
   'COA source — per-lot COA lookup. https://www.stellaandchewys.com/pages/coa ' ||
   'Lot ID lookup with a per-package "Download Report" (pathogen testing). TO DO: pull one real ' ||
   'lot COA, record lab/date/results, and grade it. Verify the URL first — last confirmed 2026-06-25.'),
  ('Natural Balance', 20,
   'COA source — per-batch results on request. https://www.naturalbalanceinc.com/feed-with-confidence/ ' ||
   'Enter a 10-digit UPC plus 7-digit lot; a registered vet tech sends ISO-17025 batch results ' ||
   '(mycotoxins, salmonella, STEC E. coli). Delivered on request rather than published, so this one ' ||
   'needs an actual request. Verify the URL first — last confirmed 2026-06-25.'),
  ('Wellness (WellPet)', 10,
   'COA source — public per-product heavy-metal table. https://www.wellnesspetfood.com/testing-results/ ' ||
   'Published values with test dates (e.g. Simple Duck & Oatmeal: As 0.30, Cd 0.22, Pb 0.08, Hg 0.02 mg/kg). ' ||
   'The lab is unnamed and there is no downloadable independent COA, so this stays brand_claim, not ' ||
   'verified_lab — record the values at that grade. Verify the URL first — last confirmed 2026-06-25.')
) as q(brand_name, priority, note)
join public.food_brands b on b.name = q.brand_name
where not exists (
  select 1 from public.admin_review_queue r
  where r.entity_type = 'lab_test' and r.entity_id = b.id and r.note like 'COA source%'
);

-- One item for the brand-name clusters this migration deliberately did NOT merge
-- (different words, not just different capitalisation) — a human call.
insert into public.admin_review_queue (entity_type, entity_id, priority, status, note)
select 'brand_merge', null, 5, 'open',
       'Remaining near-duplicate brand names need a human decision — e.g. "Stella & Chewy''s" vs ' ||
       '"Stella and Chewy''s", "Wellness" vs "Wellness CORE" (which may be a real sub-brand). ' ||
       'Migration 0035 merged only names identical after case/punctuation normalisation. Query for ' ||
       'the rest with a similarity search on food_brands.name.'
where not exists (
  select 1 from public.admin_review_queue r
  where r.entity_type = 'brand_merge' and r.note like 'Remaining near-duplicate%'
);

commit;
