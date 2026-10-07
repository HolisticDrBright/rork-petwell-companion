-- 0038 — Bring the Standard Process Veterinary Formulas line into the grading
-- system, and record what still needs confirming from the practitioner catalogue.
--
-- The twelve Standard Process rows were seeded in 0028/0030 (September), before
-- 0037 introduced app_action and the product safety rules. They therefore sat in
-- a second tier: visible in the marketplace, ungraded, never shown inside a
-- protocol, and not checked by any safety rule. This closes that split — there
-- is one product model now, not two.
--
-- Action is `vet_only` for every one of them, which is both the clinical answer
-- (kidney, liver and immune formulas belong in a vet-managed plan) and the
-- literal one: Standard Process sells through Patient Direct, so a practitioner
-- code is required to buy at all.
--
-- Grade stays C. The app owner holds a Standard Process practitioner account,
-- which is precisely why nothing here is scored up: NASC member without the
-- Quality Seal, no public COAs, brand-level evidence. Rankings are never
-- adjusted for the owner's commercial relationships.
--
-- fit_tags gain the ailment vocabulary used by expo/lib/protocols (kidney,
-- liver, cognition, diarrhea, wellness) ALONGSIDE their existing tags, so the
-- older marketplace fit-matching keeps working unchanged.

update public.marketplace_products
   set app_action = 'vet_only',
       source_store = 'standardprocess.com',
       catalog_pulled = date '2026-09-07'
 where brand ilike '%standard process%';

-- Omega-3 carries the fish-oil interaction rule like every other fish oil.
update public.marketplace_products
   set safety_rule_ids = array[8]::int[]
 where slug = 'standardprocess_vf_omega3';

-- Add the protocol ailment tags without disturbing the existing ones.
update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['kidney']::text[]))
 where slug in ('standardprocess_canine_renal', 'standardprocess_feline_renal');

update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['liver']::text[]))
 where slug in ('standardprocess_canine_hepatic', 'standardprocess_feline_hepatic');

update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['diarrhea', 'digestion']::text[]))
 where slug in ('standardprocess_canine_enteric', 'standardprocess_feline_enteric');

update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['cognition']::text[]))
 where slug = 'standardprocess_canine_cognition';

update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['wellness']::text[]))
 where slug in ('standardprocess_canine_whole_body', 'standardprocess_feline_whole_body');

update public.marketplace_products
   set fit_tags = array(select distinct unnest(fit_tags || array['immune']::text[]))
 where slug = 'standardprocess_feline_immune';

-- The September seed captured flagship SKUs, not the complete line. Three gaps
-- are worth confirming against the real Patient Direct catalogue, which only a
-- practitioner account can see:
--   * Cardiac/heart support — not in the seed. If it exists, it is the one
--     product that would let a cardiac protocol be written, since taurine is the
--     only grade-A option in that area today.
--   * Urinary/bladder support — not in the seed. Renal Support is kidney, which
--     is a different problem from FLUTD or cystitis.
--   * Canine Immune System Support — only the feline version was seeded.
insert into public.admin_review_queue (entity_type, entity_id, priority, status, note)
select 'product_submission', null, 25, 'open',
       'Confirm the full Standard Process Veterinary Formulas line against the Patient Direct catalogue (practitioner login required — this cannot be checked from the build environment, and standardprocess.com is not reachable from it). The September seed captured 12 flagship SKUs. Specifically missing and worth checking: a cardiac/heart support formula (would unblock writing a cardiac protocol), a urinary/bladder formula distinct from Renal Support, and Canine Immune System Support (only the feline version is seeded). Add any found SKUs at grade C / vet_only like the rest of the line.'
where not exists (
  select 1 from public.admin_review_queue
  where entity_type = 'product_submission' and note like 'Confirm the full Standard Process%'
);
