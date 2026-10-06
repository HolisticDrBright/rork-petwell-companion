-- 0037 — Graded supplement catalogue (Adored Beast + Dr. Judy Morgan).
--
-- 60 products from the Petwell product research of 2026-10-06, each carrying
-- Petwell's own evidence grade (A–D) and an app action that says what the app
-- is allowed to do with it:
--
--   recommend  — reasonable evidence, no safety flag
--   caution    — usable, but with a specific caveat the owner must see
--   vet_only   — needs a diagnosis, bloodwork, or a vet-set dose
--   info_only  — traditional use; shown for transparency, never suggested
--   avoid      — Petwell argues against it, and says why
--
-- `safety_rule_ids` maps to the ten rules in expo/lib/protocols/productSafety.ts
-- (greater celandine, berberine + prescriptions, colloidal silver, essential
-- oils + cats, uva ursi before urinalysis, the blocked-male-cat emergency,
-- gut-coating powders + oral meds, fish oil + NSAIDs/anticoagulants, mushroom
-- extracts alongside cancer care, and human-label products/xylitol).
--
-- The blurbs are Petwell's own writing. Store copy is deliberately not reused:
-- it is copyrighted, and it makes claims ("heals", "cures", "prevents") this app
-- will not repeat.
--
-- transparency / ingredient_quality / lab_tested / reported_outcomes keep their
-- column defaults. Those sub-scores were NOT individually assessed for this
-- batch — the grade and the action are what Petwell stands behind here, and
-- inventing per-product sub-scores would be fabricating precision.
--
-- Prices are as of the pull date and go stale. Both stores are Shopify, so
-- /products.json re-pulls the live catalogue; see docs/DATA_REFRESH.md.

alter table public.marketplace_products
  add column if not exists app_action text,
  add column if not exists safety_rule_ids int[] not null default '{}',
  add column if not exists price_usd numeric(10, 2),
  add column if not exists source_store text,
  add column if not exists is_kit boolean not null default false,
  add column if not exists catalog_pulled date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'marketplace_products_app_action_check'
  ) then
    alter table public.marketplace_products
      add constraint marketplace_products_app_action_check
      check (app_action is null or app_action in ('recommend', 'caution', 'vet_only', 'info_only', 'avoid'));
  end if;
end $$;

comment on column public.marketplace_products.app_action is
  'What the app may do with this product. ''avoid'' must never render as a recommendation.';
comment on column public.marketplace_products.safety_rule_ids is
  'Ids into expo/lib/protocols/productSafety.ts PRODUCT_SAFETY_RULES.';
comment on column public.marketplace_products.price_usd is
  'Price at catalog_pulled. Display as "price when checked", never as live.';

insert into public.marketplace_products
  (slug, category, name, species, evidence, fit_tags, blurb, brand, product_url,
   app_action, safety_rule_ids, price_usd, source_store, is_kit)
values
  ('ab-potent-sea-omega3', 'omega3', 'Potent-Sea Omega-3 (EPA & DHA)', 'both', 'A', array['joint', 'skin', 'kidney', 'heart', 'cognition']::text[], 'EPA and DHA from fish oil. Omega-3 has the strongest evidence of anything in this catalogue — established for arthritis comfort, and part of standard care in kidney and heart disease. Getting the dose right is the part that matters.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/potent-sea-omega-3', 'recommend', array[8]::int[], 39.99, 'adoredbeast.com', false),
  ('iceland-pure-sardine-anchovy', 'omega3', 'Unscented Sardine & Anchovy Oil', 'both', 'A', array['joint', 'skin', 'kidney', 'heart']::text[], 'Sardine and anchovy oil. Small, short-lived fish sit low in the food chain, which keeps accumulated contaminants down compared with larger species.', 'Iceland Pure', 'https://drjudymorgan.com/products/iceland-pure-unscented-sardine-anchovy-oil', 'recommend', array[8]::int[], 23.99, 'drjudymorgan.com', false),
  ('iceland-pure-salmon', 'omega3', 'Unscented Salmon Oil', 'both', 'A', array['joint', 'skin', 'kidney', 'heart']::text[], 'Salmon oil from the same line. Between this and the sardine/anchovy version, pick whichever your pet will actually eat — the EPA and DHA are what count.', 'Iceland Pure', 'https://drjudymorgan.com/products/iceland-pure-unscented-salmon-oil', 'recommend', array[8]::int[], 22.99, 'drjudymorgan.com', false),
  ('drjudy-pea-40g', 'supplements', 'PEA (Palmitoylethanolamide) 40 g', 'dog', 'B', array['itch', 'joint', 'pain']::text[], 'Palmitoylethanolamide, a fatty-acid compound the body makes itself, studied for itch and discomfort. The supporting study followed 160 dogs with atopic dermatitis but was open-label with no placebo group — good, not definitive, which is why it is a B.', 'Dr. Judy Morgan''s Naturally Healthy Pets', 'https://drjudymorgan.com/products/dr-judys-pea-palmitoylethanolamide-40g', 'recommend', '{}'::int[], 59.99, 'drjudymorgan.com', false),
  ('feline-essentials-pea', 'supplements', 'Palmitoylethanolamide (PEA) 9 g', 'cat', 'C', array['itch', 'pain']::text[], 'The cat formulation of PEA. The dog evidence is stronger than the cat evidence, so this sits a grade lower than the canine product.', 'Feline Essentials', 'https://drjudymorgan.com/products/feline-essentials-palmitoylethanolamide-pea-14g', 'recommend', '{}'::int[], 29.99, 'drjudymorgan.com', false),
  ('drjudy-wellness-formula', 'supplements', 'Wellness Formula', 'both', 'C', array['joint', 'wellness']::text[], 'Green-lipped mussel, deer velvet and colostrum. Green-lipped mussel has modest joint evidence behind it. Contains shellfish — skip it if your pet reacts to shellfish.', 'Dr. Judy Morgan''s Naturally Healthy Pets', 'https://drjudymorgan.com/products/dr-morgans-wellness-formula', 'recommend', '{}'::int[], 39.99, 'drjudymorgan.com', false),
  ('drjudy-elk-velvet', 'supplements', 'Elk Velvet Antler Powder 30 g', 'dog', 'C', array['joint']::text[], 'Elk velvet antler, a traditional joint remedy with one small canine study behind it. Worth knowing it sits at C, not B.', 'Dr. Judy Morgan''s Naturally Healthy Pets', 'https://drjudymorgan.com/products/dr-judys-elk-velvet-antler-powder-30g', 'recommend', '{}'::int[], 49.99, 'drjudymorgan.com', false),
  ('cosequin-for-cats', 'supplements', 'Cosequin for Cats', 'cat', 'C', array['joint', 'urinary']::text[], 'Glucosamine and chondroitin formulated for cats. Joint trial results are mixed across the category, but it is long-established and well tolerated.', 'Nutramax (via Covetrus)', 'https://drjudymorgan.com/products/cosequin-for-cats', 'recommend', '{}'::int[], 27, 'drjudymorgan.com', false),
  ('woof-glm-treats', 'treats', 'Green Lipped Mussel Treats', 'dog', 'C', array['joint']::text[], 'Green-lipped mussel in treat form — an easy way to get it into a dog that refuses powders. Contains shellfish.', 'The New Zealand Pet Food Co', 'https://drjudymorgan.com/products/woof-green-lipped-mussels-treats', 'recommend', '{}'::int[], 13.99, 'drjudymorgan.com', false),
  ('ab-jump-for-joynts', 'supplements', 'Jump for JOYnts', 'both', 'D', array['joint']::text[], 'A homeopathic joint product. Listed so you can see what''s in the range; for joint comfort, fish oil is the one with trials behind it.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/jump-for-joynts', 'info_only', '{}'::int[], 29.99, 'adoredbeast.com', false),
  ('ab-fidos-flora', 'probiotics', 'Fido''s Flora (canine probiotic)', 'dog', 'C', array['diarrhea', 'allergy']::text[], 'A probiotic built from strains originally isolated from dogs. Matching strains to the species is a sound idea; the randomised trials sit behind multi-strain probiotics generally rather than this specific blend.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/fidos-flora', 'recommend', '{}'::int[], 55.99, 'adoredbeast.com', false),
  ('ab-felixs-flora', 'probiotics', 'Felix''s Flora (feline probiotic)', 'cat', 'C', array['diarrhea', 'allergy']::text[], 'The cat equivalent, using feline-derived strains. Reasonable for loose stool; the evidence is small-study rather than randomised.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/felixs-flora-species-appropriate-probiotic', 'recommend', '{}'::int[], 39.99, 'adoredbeast.com', false),
  ('ab-love-bugs', 'probiotics', 'Love Bugs (pre & probiotic)', 'both', 'C', array['diarrhea']::text[], 'A 14-strain, 30-billion-CFU blend with prebiotic fibre. Multi-strain probiotics are the ones with actual trials for short-term diarrhoea in dogs.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/love-bugs', 'recommend', '{}'::int[], 31.99, 'adoredbeast.com', false),
  ('ab-the-wolf', 'probiotics', 'The Wolf (species-appropriate probiotic)', 'dog', 'C', array['diarrhea']::text[], 'A probiotic aimed at dogs on raw diets. Same evidence tier as the other multi-strain probiotics in this catalogue.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/wolf-strain-probiotic', 'recommend', '{}'::int[], 59.99, 'adoredbeast.com', false),
  ('ab-healthy-gut', 'enzymes', 'Healthy Gut (enzymes + pre & probiotic)', 'both', 'C', array['diarrhea', 'digestion']::text[], 'Probiotic and digestive enzymes in one powder. Added enzymes matter for diagnosed pancreatic insufficiency; for an ordinary upset stomach the probiotic is doing the work.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/healthy-gut', 'recommend', '{}'::int[], 34.99, 'adoredbeast.com', false),
  ('ab-canine-gut-soothe', 'probiotics', 'Canine Gut Soothe', 'dog', 'C', array['diarrhea', 'ibd']::text[], '30 billion CFU with slippery elm, L-glutamine and deglycyrrhizinated liquorice. The soothing ingredients coat the gut — which is exactly why they need spacing from medication.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/canine-gut-soothe', 'caution', array[7]::int[], 34.99, 'adoredbeast.com', false),
  ('ab-feline-gut-soothe', 'probiotics', 'Feline Gut Soothe', 'cat', 'C', array['diarrhea', 'ibd']::text[], 'The cat formulation of Gut Soothe. Same caveat: it coats the gut, so keep it an hour or two away from oral medicines.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/feline-gut-soothe', 'caution', array[7]::int[], 29.99, 'adoredbeast.com', false),
  ('ab-soil-and-sea', 'probiotics', 'Soil & Sea (primordial pre & probiotics)', 'both', 'D', array['diarrhea']::text[], 'Soil-based organisms with marine prebiotics. Soil-based probiotics are popular and barely studied in dogs and cats — listed so you can see it, not recommended.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/soil-sea-primordial-pre-and-probiotics', 'info_only', '{}'::int[], 55.99, 'adoredbeast.com', false),
  ('now-s-boulardii', 'probiotics', 'Saccharomyces Boulardii, 60 capsules', 'both', 'C', array['diarrhea']::text[], 'A probiotic yeast rather than a bacterium, which is why it can be given alongside antibiotics. Reasonable evidence in acute and antibiotic-associated diarrhoea. A human product, so the dose comes from your vet.', 'NOW Foods', 'https://drjudymorgan.com/products/now', 'recommend', array[10]::int[], 21.99, 'drjudymorgan.com', false),
  ('dr-harveys-runs-be-done', 'supplements', 'Runs Be Done', 'both', 'D', array['diarrhea']::text[], 'A herbal blend for loose stool. Traditional use; we found no trials in dogs or cats.', 'Dr. Harvey''s', 'https://drjudymorgan.com/products/dr-harveys-runs-be-done', 'info_only', '{}'::int[], 32.95, 'drjudymorgan.com', false),
  ('kinkind-healthy-poops', 'supplements', 'Organic Healthy Poops (pumpkin fibre)', 'dog', 'C', array['stool', 'anal_glands']::text[], 'Pumpkin-based fibre. Added fibre genuinely firms stool and helps some dogs empty their anal glands on their own — cheap and sensible to try before anything more involved.', 'kin+kind', 'https://drjudymorgan.com/products/kin-kind-pumpkin-fiber-bowel-supplement', 'recommend', '{}'::int[], 13.99, 'drjudymorgan.com', false),
  ('now-l-glutamine', 'supplements', 'L-Glutamine, 6 oz', 'both', 'C', array['chronic_gi']::text[], 'L-glutamine, an amino acid the gut lining uses as fuel. A human product, and a gut-coating powder — so it needs both a vet dose and spacing from oral medicines.', 'NOW Foods', 'https://drjudymorgan.com/products/now-l-glutamine-6-oz', 'caution', array[7, 10]::int[], 19.99, 'drjudymorgan.com', false),
  ('ab-liver-tonic', 'supplements', 'Liver Tonic', 'both', 'D', array['liver', 'detox']::text[], 'Dandelion, milk thistle, barberry and greater celandine in glycerin. Milk thistle has some support behind it; greater celandine is the reason this carries a liver warning, and barberry is why it needs checking against any prescription.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/liver-tonic', 'caution', array[1, 2]::int[], 29.99, 'adoredbeast.com', false),
  ('solutions-milk-thistle', 'supplements', 'Milk Thistle, 8 oz', 'both', 'C', array['liver']::text[], 'Milk thistle (silybin), the best-studied liver herb there is. Still a C — the studies in dogs and cats are small.', 'Solutions Pet Products', 'https://drjudymorgan.com/products/solutions-pet-products-milk-thistle-8oz', 'caution', '{}'::int[], 45.99, 'drjudymorgan.com', false),
  ('now-same-200', 'supplements', 'SAMe 200 mg Capsules', 'both', 'B', array['liver', 'cognition']::text[], 'SAMe, used both in liver support and in canine cognitive decline. It has to be enteric-coated to survive the stomach, and it''s a human tablet — the dose comes from your vet.', 'NOW Foods', 'https://drjudymorgan.com/products/now-same-200-mg-capsules', 'vet_only', array[10]::int[], 39.99, 'drjudymorgan.com', false),
  ('rx-hepato-support', 'supplements', 'Rx Hepato Support', 'both', 'C', array['liver']::text[], 'A combined liver-support formula. Liver disease needs bloodwork and a diagnosis before any supplement — the numbers decide what helps.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-hepato-support', 'vet_only', '{}'::int[], 37.79, 'drjudymorgan.com', false),
  ('rx-phos-bind', 'supplements', 'Rx Phos-Bind', 'both', 'B', array['kidney']::text[], 'A phosphate binder. Controlling phosphorus is one of the few interventions shown to extend life in chronic kidney disease — and it is dosed against a blood phosphorus level, which is why it can''t be bought on a hunch.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-phos-bind', 'vet_only', '{}'::int[], 27.3, 'drjudymorgan.com', false),
  ('rx-renal-feline-beadlets', 'supplements', 'Rx Renal Feline Beadlets, 100 g', 'cat', 'C', array['kidney']::text[], 'A feline kidney-support blend. It belongs inside a staged CKD plan built on bloodwork, not instead of one.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-renal-feline-beadlets-100g', 'vet_only', '{}'::int[], 48.29, 'drjudymorgan.com', false),
  ('aminavast-kidney', 'supplements', 'AminAvast Kidney Support, 60 count', 'both', 'C', array['kidney']::text[], 'An amino-acid based kidney support. Small studies behind it; it sits alongside a vet-managed CKD plan, including diet and phosphorus control.', 'Bio-Vet (via Covetrus)', 'https://drjudymorgan.com/products/aminavast-kidney-support-for-cats', 'vet_only', '{}'::int[], 37, 'drjudymorgan.com', false),
  ('ab-easy-peesy-ii', 'supplements', 'Easy Peesy II (nutraceutical powder)', 'both', 'C', array['urinary']::text[], 'Cranberry, D-mannose, uva ursi and a probiotic, per quarter teaspoon. It shifts urine pH, which helps one crystal type and worsens another — so the crystal type has to be known before it starts.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/easy-peesy-ii-nutraceutical-powder', 'caution', array[5, 6]::int[], 32.99, 'adoredbeast.com', false),
  ('ab-easy-peesy-protocol', 'supplements', 'Easy Peesy Protocol (kit)', 'both', 'C', array['urinary']::text[], 'A 30-day kit pairing a homeopathic liquid with the Easy Peesy II powder. Graded by its parts: the powder is the half with ingredients behind it.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/easy-peesy-protocol', 'caution', array[5, 6]::int[], 54.99, 'adoredbeast.com', true),
  ('rx-cranberry', 'supplements', 'Rx Cranberry', 'both', 'C', array['urinary']::text[], 'Cranberry extract. The trials split: one small study in dogs with recurrent UTI was positive, and a randomised trial after disc surgery found no benefit. Reasonable to try, not something to rely on.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-cranberry', 'caution', array[5]::int[], 30.49, 'drjudymorgan.com', false),
  ('checkup-urine-strips', 'home_test', 'CheckUp Pet Urine Testing Strips (50)', 'both', 'B', array['urinary', 'kidney']::text[], 'Home urine dipsticks. Genuinely useful for catching a change early and for deciding whether a visit is urgent. Save the result to Records so your vet can see the trend — and treat a positive strip as a reason to book, not to self-treat.', 'Coastline Global', 'https://drjudymorgan.com/products/checkup-pet-urine-testing-strips', 'recommend', '{}'::int[], 19.99, 'drjudymorgan.com', false),
  ('checkup-kit4cat', 'home_test', 'CheckUp Kit4Cat Urine Collection Litter', 'cat', 'B', array['urinary']::text[], 'Hydrophobic litter that lets urine pool so you can collect a sample at home. Makes a vet urinalysis possible without a trip just for the sample.', 'Coastline Global', 'https://drjudymorgan.com/products/checkup-kit4cat-urine-collection-litter', 'recommend', '{}'::int[], 14.99, 'drjudymorgan.com', false),
  ('biovibrant-heart-taurine', 'supplements', 'BioVibrant HEART+ (Taurine Plus), 3.5 oz', 'both', 'A', array['heart']::text[], 'Taurine. In cats, and in dogs shown to be deficient, this is the real thing — taurine deficiency causes a heart muscle disease that can reverse when it''s corrected. It supports cardiology care and never replaces heart medication.', 'inClover', 'https://drjudymorgan.com/products/biovibrant-taurine-plus', 'vet_only', '{}'::int[], 25.99, 'drjudymorgan.com', false),
  ('rx-formula-cv', 'supplements', 'Rx Formula CV', 'both', 'C', array['heart']::text[], 'A cardiovascular support blend. An adjunct to a cardiologist''s plan — heart disease is managed on medication and monitoring.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-formula-cv', 'vet_only', '{}'::int[], 48.29, 'drjudymorgan.com', false),
  ('cocotherapy-mct3', 'supplements', 'TriPlex MCT-3 Coconut Oil', 'dog', 'B', array['cognition']::text[], 'Medium-chain triglycerides, which give an ageing brain an alternative fuel. One of the better-evidenced options here for canine cognitive dysfunction. Worth ruling out pain and thyroid disease first — they look like dementia.', 'CocoTherapy', 'https://drjudymorgan.com/products/cocotherapy-triplex-mct-3-oil', 'recommend', '{}'::int[], 27.99, 'drjudymorgan.com', false),
  ('real-mushrooms-lions-mane', 'supplements', 'Organic Lion''s Mane Mushroom Powder, 60 g', 'both', 'D', array['cognition']::text[], 'Lion''s mane mushroom powder. Interesting in rodent work, unstudied in dogs and cats.', 'Real Mushrooms', 'https://drjudymorgan.com/products/real-mushroom-organic-lions-mane-mushroom-powder-60g', 'info_only', '{}'::int[], 34.99, 'drjudymorgan.com', false),
  ('rx-nutricalm', 'supplements', 'Rx NutriCalm', 'both', 'C', array['anxiety']::text[], 'A calming blend for situational stress such as fireworks or travel. Worth trying for predictable events; ongoing anxiety deserves a proper behaviour plan rather than a supplement.', 'Rx Vitamins', 'https://drjudymorgan.com/products/rx-nutricalm', 'recommend', '{}'::int[], 38.89, 'drjudymorgan.com', false),
  ('now-melatonin-3mg', 'supplements', 'Melatonin 3 mg', 'dog', 'C', array['anxiety', 'sleep']::text[], 'Melatonin, used for noise fear and for dogs whose sleep cycle has drifted. A human product — check the label for xylitol, which is poisonous to dogs, and get the dose from your vet.', 'NOW Foods', 'https://drjudymorgan.com/products/now-melatonin-3-mg', 'caution', array[10]::int[], 6.99, 'drjudymorgan.com', false),
  ('ab-your-go-2', 'supplements', 'Your Go 2 (first response support)', 'both', 'D', array['first_aid', 'anxiety']::text[], 'A homeopathic liquid sold for shock and upset. Whatever you make of homeopathy, nothing in this category should delay a vet visit for a real injury.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/your-go-2', 'info_only', '{}'::int[], 27.99, 'adoredbeast.com', false),
  ('ab-yeasty-beast-spray', 'grooming', 'Yeasty Beast Topical Spray', 'dog', 'C', array['yeast', 'itch']::text[], 'Apple cider vinegar and herbs as a topical spray. Low-cost and low-risk on intact skin — stop if the skin is broken, raw or sore, which needs a vet.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/yeasty-beast-topical-spray', 'recommend', '{}'::int[], 29.99, 'adoredbeast.com', false),
  ('ab-skin-health-spray', 'grooming', 'Skin HEALth Spray', 'both', 'D', array['wounds']::text[], 'A topical for minor scrapes. Fine on a surface graze; anything deep, dirty, or not healing needs to be seen.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/skin-health-spray', 'info_only', '{}'::int[], 29.99, 'adoredbeast.com', false),
  ('kinkind-itchy-shampoo', 'grooming', 'Itchy Dog Shampoo (tea tree + grapefruit)', 'dog', 'D', array['itch']::text[], 'A tea-tree and grapefruit shampoo. Dogs only, and keep it away from any cat in the house — including while the coat is still damp and a cat might groom it.', 'kin+kind', 'https://drjudymorgan.com/products/kin-kind-healing-clay-shampoo', 'caution', array[4]::int[], 15, 'drjudymorgan.com', false),
  ('ab-turkey-tail', 'supplements', 'Turkey Tail Mushrooms (liquid extract)', 'both', 'C', array['cancer_support', 'immune']::text[], 'Turkey tail mushroom extract, the source of the PSP fraction. An add-on alongside oncology care only — the randomised trial is the reason for the caveat.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/turkey-tail-mushrooms', 'caution', array[9]::int[], 32.99, 'adoredbeast.com', false),
  ('real-mushrooms-turkey-tail-caps', 'supplements', 'Organic Turkey Tail Capsules, 90 count', 'both', 'C', array['cancer_support', 'immune']::text[], 'Turkey tail in capsule form. Same position: alongside oncology care, never instead of it.', 'Real Mushrooms', 'https://drjudymorgan.com/products/real-mushrooms-organic-turkey-tail-capsules-90-count', 'caution', array[9]::int[], 29.99, 'drjudymorgan.com', false),
  ('ab-chaga', 'supplements', 'Chaga Mushrooms (liquid extract)', 'both', 'D', array['immune']::text[], 'Chaga mushroom extract. No pet trials, and chaga is high in oxalate — which matters for any pet with a history of oxalate bladder stones.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/chaga-mushrooms-liquid-extract', 'info_only', '{}'::int[], 59.99, 'adoredbeast.com', false),
  ('ab-pawsitive-immunity', 'supplements', 'Pawsitive Immunity (colostrum alternative)', 'both', 'D', array['immune', 'allergy']::text[], 'Bovine plasma immunoglobulins, sold as an alternative to colostrum. Plausible mechanism, no pet trials we could find.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/pawsitive-immunity', 'info_only', '{}'::int[], 39.99, 'adoredbeast.com', false),
  ('ab-vital-defense', 'supplements', 'Vital Defense (cellular support)', 'both', 'D', array['longevity']::text[], 'A blend aimed at cellular ageing. No defined outcome to measure and no trials — at this price, that''s worth saying plainly.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/vital-defense-cellular-support', 'info_only', '{}'::int[], 119.99, 'adoredbeast.com', false),
  ('ab-phyto-synergy', 'supplements', 'Phyto Synergy (marine phytoplankton)', 'both', 'D', array['wellness']::text[], 'Marine phytoplankton, sold as an antioxidant. Traditional use, no pet studies behind it.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/phyto-synergy', 'info_only', '{}'::int[], 61.99, 'adoredbeast.com', false),
  ('ab-rebalancer', 'supplements', 'Rebalancer', 'both', 'D', array['vaccinosis']::text[], 'A homeopathic sold for “vaccinosis”. Listed because it opens several of the kits — not as evidence that vaccines cause the harms that term implies. They are not shown to.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/rebalancer', 'info_only', '{}'::int[], 27.99, 'adoredbeast.com', false),
  ('drjudy-dental-formula', 'dental', 'Dental Health Formula', 'both', 'C', array['dental']::text[], 'Dental drops containing peppermint and cinnamon oils — which is a problem for cats specifically. No VOHC seal; brushing and a vet dental are still what shift tartar.', 'Dr. Judy Morgan''s Naturally Healthy Pets', 'https://drjudymorgan.com/products/dr-morgans-dental-drops', 'caution', array[4]::int[], 39.99, 'drjudymorgan.com', false),
  ('drjudy-flea-comb', 'parasite', 'Flea Comb for Dogs and Cats', 'both', 'B', array['fleas']::text[], 'A flea comb. Unglamorous and genuinely effective — it confirms whether there are fleas at all, and it''s the safe option for animals too young or too small for anything else.', 'Dr. Judy Morgan''s Naturally Healthy Pets', 'https://drjudymorgan.com/products/flea-comb-for-dogs-and-cats', 'recommend', '{}'::int[], 5.99, 'drjudymorgan.com', false),
  ('flea-destroyer-nematodes', 'parasite', 'Flea Destroyer (beneficial nematodes)', 'both', 'C', array['fleas']::text[], 'Microscopic worms applied to the yard, where they feed on flea larvae in soil. A reasonable part of breaking the outdoor half of the flea cycle. It goes on the ground, not on the pet.', 'Flea Destroyer', 'https://drjudymorgan.com/products/flea-destroyer-beneficial-nematodes', 'recommend', '{}'::int[], 59.99, 'drjudymorgan.com', false),
  ('fleasgone-tag', 'parasite', 'FleasGone Tag', 'both', 'D', array['fleas', 'ticks']::text[], 'Petwell doesn''t recommend this. There''s no evidence a tag repels fleas or ticks, and in an area with ticks or heartworm, a preventive that doesn''t work is a genuine risk rather than a neutral one.', 'FleasGone', 'https://drjudymorgan.com/products/fleasgone-tag-non-toxic-flea-and-tick-prevention', 'avoid', '{}'::int[], 79.99, 'drjudymorgan.com', false),
  ('ab-colloidal-silversol', 'supplements', 'Colloidal SilverSol', 'both', 'D', array['infection']::text[], 'Petwell doesn''t recommend colloidal silver. There is no good evidence it treats infection, and prolonged use can permanently discolour skin. An infection needs a vet.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/colloidal-silversol', 'avoid', array[3]::int[], 24.99, 'adoredbeast.com', false),
  ('vdi-allergy-panel', 'home_test', 'Allergy Panel Test Kit', 'both', 'D', array['allergy']::text[], 'Petwell doesn''t recommend hair or saliva allergy tests. They have not been shown to tell allergic animals from healthy ones. For food allergy the answer is a vet-supervised elimination diet; for environmental allergy it''s intradermal or serum IgE testing through a vet.', 'VDI Laboratory', 'https://drjudymorgan.com/products/allergy-panel-test-kit', 'avoid', '{}'::int[], 240, 'drjudymorgan.com', false),
  ('ab-leaky-gut-protocol', 'supplements', 'Leaky Gut Protocol (kit)', 'dog', 'D', array['chronic_gi', 'allergy']::text[], 'A four-product course run over several weeks. Petwell grades the pieces rather than the bundle: the probiotic and glutamine parts are reasonable, the homeopathics aren''t, and “leaky gut” isn''t something a vet can confirm. Chronic diarrhoea needs a workup first.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/leaky-gut-protocol', 'info_only', array[1, 2, 7]::int[], 139.99, 'adoredbeast.com', true),
  ('ab-yeasty-beast-protocol', 'supplements', 'Yeasty Beast Protocol (3-product kit)', 'dog', 'D', array['yeast', 'itch']::text[], 'A staged kit run over roughly 60 days. The “die-off” idea it''s sold on has no evidence behind it, and itch has many causes — fleas, atopy, food — worth ruling out before a two-month course.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/yeasty-beast-protocol-3-product-kit', 'info_only', array[1, 2]::int[], 79.99, 'adoredbeast.com', true),
  ('ab-canine-allergy-bundle', 'supplements', 'Canine Allergy Bundle (kit)', 'dog', 'C', array['allergy']::text[], 'Liver Tonic, Phyto Synergy and a probiotic sold together for itch. Omega-3 and PEA have better evidence for itch than anything in this bundle, at lower cost.', 'Adored Beast Apothecary', 'https://adoredbeast.com/products/canine-allergy-bundle', 'info_only', array[1, 2]::int[], 132.99, 'adoredbeast.com', true)
on conflict (slug) do update set
  category = excluded.category,
  name = excluded.name,
  species = excluded.species,
  evidence = excluded.evidence,
  fit_tags = excluded.fit_tags,
  blurb = excluded.blurb,
  brand = excluded.brand,
  product_url = excluded.product_url,
  app_action = excluded.app_action,
  safety_rule_ids = excluded.safety_rule_ids,
  price_usd = excluded.price_usd,
  source_store = excluded.source_store,
  is_kit = excluded.is_kit;

update public.marketplace_products
   set catalog_pulled = date '2026-10-06',
       source_notes = 'Petwell product research 2026-10-06. Grade and action are Petwell''s own, from the published evidence. Label-transparency and ingredient-quality sub-scores were not individually assessed for this batch.',
       evidence_status = 'admin_reviewed'
 where source_store in ('adoredbeast.com', 'drjudymorgan.com');

-- Queue the open commercial question from the research doc: neither store
-- publishes an affiliate programme, so no affiliate link can be added honestly
-- until the terms are confirmed. The link chain falls back to the product page,
-- which is what these rows carry.
insert into public.admin_review_queue (entity_type, entity_id, priority, status, note)
select 'product_submission', null, 15, 'open',
       'Confirm affiliate terms with adoredbeast.com and drjudymorgan.com before any affiliate link is added to the 60 graded products from the 2026-10-06 research. Neither store publishes a public programme. Until then these rows link to the product page only, which is correct — an affiliate link that was never agreed is worse than none.'
where not exists (
  select 1 from public.admin_review_queue
  where entity_type = 'product_submission' and note like 'Confirm affiliate terms with adoredbeast.com%'
);
