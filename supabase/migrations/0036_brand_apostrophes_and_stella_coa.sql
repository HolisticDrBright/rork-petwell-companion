-- 0036 — Straighten typographic apostrophes in brand names, and queue the one
-- COA source 0035 missed.
--
-- 0035 merged "Stella & Chewy's" into "Stella & Chewy’s" (the curly-apostrophe
-- row won on the tie-breakers). Two problems with leaving it there:
--
--  1. The recall alert matcher asks whether a free-text food log contains the
--     brand name (lib/food/recallNotify.ts). Nobody types U+2019, so a pet fed
--     "stella & chewy's raw" would not be matched to a recall on that brand.
--  2. 0035's COA queue insert joined on the exact name and therefore skipped it.
--
-- Straightening the apostrophes cannot create a new duplicate: 0035 already
-- collapsed every cluster that is identical once punctuation is normalised, so
-- each such cluster is down to a single row.

begin;

update public.food_brands
set name = translate(name, '’‘‛`´', '''''''''')
where name <> translate(name, '’‘‛`´', '''''''''');

-- Also straighten product names, for the same matching reason.
update public.food_products
set name = translate(name, '’‘‛`´', '''''''''')
where name <> translate(name, '’‘‛`´', '''''''''');

-- Queue the COA source(s) still missing, matched on the normalised key rather
-- than an exact string so a punctuation difference can't drop one silently.
insert into public.admin_review_queue (entity_type, entity_id, priority, status, note)
select 'lab_test', b.id, q.priority, 'open', q.note
from (values
  ('stellachewys', 30,
   'COA source — per-lot COA lookup. https://www.stellaandchewys.com/pages/coa ' ||
   'Lot ID lookup with a per-package "Download Report" (pathogen testing). TO DO: pull one real ' ||
   'lot COA, record lab/date/results, and grade it. Verify the URL first — last confirmed 2026-06-25.')
) as q(norm_key, priority, note)
join public.food_brands b
  on regexp_replace(lower(b.name), '[^a-z0-9]+', '', 'g') = q.norm_key
where not exists (
  select 1 from public.admin_review_queue r
  where r.entity_type = 'lab_test' and r.entity_id = b.id and r.note like 'COA source%'
);

commit;
