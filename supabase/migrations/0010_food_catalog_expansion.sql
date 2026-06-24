-- Petwell · 0010 food catalog expansion (demo/seed data)
-- Brings the reference catalog to 10 fictional brands and 20 products with
-- barcodes, ingredient decks + aliases, nutrition, manufacturer transparency,
-- recalls, and DEMO lab evidence. All brands/products/lab results here are
-- illustrative seed data — NOT real and not an endorsement. Lab rows are marked
-- is_demo = true and cite the "Petwell Demo Lab Dataset" source.

-- ─────────────────────────── brands (6 new → 10 total) ───────────────────────
insert into public.food_brands (name, manufacturer, country) values
  ('Prairie Provisions',  'Prairie Provisions LLC (sample)', 'USA'),
  ('Summit Raw Co.',      'Summit Raw Co. (sample)',         'USA'),
  ('Gentle Bowl',         'Gentle Bowl Pet (sample)',        'USA'),
  ('Budget Bites',        'Budget Bites Inc. (sample)',      'USA'),
  ('Feline Form',         'Feline Form (sample)',            'USA'),
  ('PureTrail Naturals',  'PureTrail Naturals (sample)',     'Canada')
on conflict (name) do nothing;

insert into public.manufacturer_quality_profiles (brand_id, owns_facilities, recall_count, transparency_score, notes)
select b.id, v.owns, v.recalls, v.score, v.notes
from (values
  ('Prairie Provisions', true,  0, 78, 'Owns a single plant; publishes nutrient analyses on request'),
  ('Summit Raw Co.',     true,  0, 90, 'Owns facility; lot-level pathogen testing program disclosed'),
  ('Gentle Bowl',        false, 0, 72, 'Co-manufactured limited-ingredient line; sourcing list published'),
  ('Budget Bites',       false, 2, 38, 'Multiple co-manufacturers; limited sourcing disclosure'),
  ('Feline Form',        true,  0, 80, 'Cat-focused formulator; veterinary advisory board'),
  ('PureTrail Naturals', false, 0, 70, 'Boutique brand; novel proteins, limited public testing')
) as v(brand, owns, recalls, score, notes)
join public.food_brands b on b.name = v.brand
on conflict (brand_id) do nothing;

-- ─────────────────────────── products ───────────────────────
-- Backfill barcode / life stage / AAFCO on the original five.
update public.food_products p set
  barcode = v.barcode, life_stage = v.life_stage, aafco_statement = v.aafco
from (values
  ('Lamb & Rice Recipe',    '0850000000011', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Chicken & Pea Formula', '0850000000028', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Puppy Growth Formula',  '0850000000035', 'puppy',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for growth.'),
  ('Salmon Chew Treats',    '0850000000042', 'all',    'Intended for intermittent or supplemental feeding only.'),
  ('Renal Support Wet',     '0850000000059', 'adult',  'Use only as directed by your veterinarian; intended for intermittent or supplemental feeding.')
) as v(name, barcode, life_stage, aafco)
where p.name = v.name;

insert into public.food_products (brand_id, name, product_type, species, form, calorie_density, barcode, life_stage, aafco_statement)
select b.id, v.name, v.ptype, v.species, v.form, v.cal, v.barcode, v.life_stage, v.aafco
from (values
  ('Meadow & Main',     'Senior Lamb & Sweet Potato', 'food',       'dog', 'kibble',       'moderate',      '0850000000066', 'senior', 'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Prairie Provisions','Beef & Barley Dinner',       'food',       'dog', 'kibble',       'moderate',      '0850000000073', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Prairie Provisions','Grain-Free Duck & Lentil',   'food',       'dog', 'kibble',       'moderate',      '0850000000080', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Summit Raw Co.',    'Freeze-Dried Beef Morsels',  'food',       'dog', 'freeze-dried', 'calorie-dense', '0850000000097', 'all',    'Formulated to meet the AAFCO Dog Food Nutrient Profiles for all life stages.'),
  ('Summit Raw Co.',    'Turkey & Pumpkin Recipe',    'food',       'dog', 'wet',          'moderate',      '0850000000103', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Gentle Bowl',       'LID Salmon & Sweet Potato',  'food',       'dog', 'kibble',       'moderate',      '0850000000110', 'all',    'Formulated to meet the AAFCO Dog Food Nutrient Profiles for all life stages.'),
  ('Gentle Bowl',       'Venison & Pea LID',          'food',       'dog', 'kibble',       'moderate',      '0850000000127', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Budget Bites',      'Everyday Chicken & Corn',    'food',       'dog', 'kibble',       'moderate',      '0850000000134', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('Budget Bites',      'Beefy Bites Treats',         'treat',      'dog', 'chew',         'calorie-dense', '0850000000141', 'all',    'Intended for intermittent or supplemental feeding only.'),
  ('Coastal Catch',     'Sardine & Kelp Cat Food',    'food',       'cat', 'wet',          'moderate',      '0850000000158', 'adult',  'Formulated to meet the AAFCO Cat Food Nutrient Profiles for adult maintenance.'),
  ('Feline Form',       'Indoor Chicken Recipe',      'food',       'cat', 'kibble',       'moderate',      '0850000000165', 'adult',  'Formulated to meet the AAFCO Cat Food Nutrient Profiles for adult maintenance.'),
  ('Feline Form',       'Kitten Salmon Pate',         'food',       'cat', 'wet',          'calorie-dense', '0850000000172', 'kitten', 'Formulated to meet the AAFCO Cat Food Nutrient Profiles for growth.'),
  ('PureTrail Naturals','Wild Boar & Apple',          'food',       'dog', 'kibble',       'moderate',      '0850000000189', 'adult',  'Formulated to meet the AAFCO Dog Food Nutrient Profiles for adult maintenance.'),
  ('PureTrail Naturals','Joint Support Supplement',   'supplement', 'dog', 'chew',         'calorie-dense', '0850000000196', 'senior', 'Supplement — intended for intermittent or supplemental use; not a complete diet.'),
  ('Whisker Wellness',  'Hairball Control Chicken',   'food',       'cat', 'kibble',       'moderate',      '0850000000202', 'adult',  'Formulated to meet the AAFCO Cat Food Nutrient Profiles for adult maintenance.')
) as v(brand, name, ptype, species, form, cal, barcode, life_stage, aafco)
join public.food_brands b on b.name = v.brand
where not exists (select 1 from public.food_products p2 where p2.name = v.name);

-- ─────────────────────────── ingredients + allergen tags ───────────────────────
insert into public.food_ingredients (name, category, is_common_allergen) values
  ('Chicken', 'protein', true),
  ('Chicken by-product meal', 'protein', true),
  ('Chicken liver', 'protein', true),
  ('Beef', 'protein', true),
  ('Beef meal', 'protein', true),
  ('Egg', 'protein', true),
  ('Corn', 'grain', true),
  ('Wheat', 'grain', true),
  ('Soy', 'legume', true),
  ('Barley', 'grain', false),
  ('Duck', 'protein', false),
  ('Turkey', 'protein', false),
  ('Venison', 'protein', false),
  ('Wild boar', 'protein', false),
  ('Sardines', 'protein', false),
  ('Pumpkin', 'vegetable', false),
  ('Sweet potato', 'vegetable', false),
  ('Carrots', 'vegetable', false),
  ('Apple', 'fruit', false),
  ('Kelp', 'supplement', false),
  ('Glucosamine', 'supplement', false),
  ('Chondroitin', 'supplement', false),
  ('Salmon oil', 'fat', false),
  ('Flaxseed', 'seed', false),
  ('Brewers rice', 'grain', false),
  ('Salt', 'additive', false),
  ('Caramel color', 'additive', false),
  ('BHA/BHT (preservative)', 'additive', false)
on conflict (name) do nothing;

-- Tag two existing proteins as common allergens.
update public.food_ingredients set is_common_allergen = true where name in ('Chicken meal', 'Lamb');

-- Aliases: map common label/OCR surface forms onto canonical ingredients.
insert into public.ingredient_aliases (ingredient_id, alias)
select i.id, v.alias
from (values
  ('Chicken', 'deboned chicken'),
  ('Chicken', 'chicken (deboned)'),
  ('Chicken by-product meal', 'chicken by-product'),
  ('Chicken meal', 'dehydrated chicken'),
  ('Brown rice', 'ground brown rice'),
  ('Brewers rice', 'brewer''s rice'),
  ('Sweet potato', 'sweet potatoes'),
  ('Sweet potato', 'dried sweet potato'),
  ('Sardines', 'whole sardines'),
  ('Kelp', 'dried kelp'),
  ('Corn', 'cornmeal'),
  ('Corn', 'ground corn'),
  ('Corn', 'corn gluten meal'),
  ('Wheat', 'wheat flour'),
  ('Wheat', 'ground wheat'),
  ('Soy', 'soybean meal'),
  ('Egg', 'dried egg'),
  ('Egg', 'egg product'),
  ('Salmon oil', 'fish oil'),
  ('Salmon oil', 'menhaden fish oil'),
  ('Glucosamine', 'glucosamine hydrochloride'),
  ('BHA/BHT (preservative)', 'bha'),
  ('BHA/BHT (preservative)', 'bht'),
  ('Caramel color', 'caramel'),
  ('Flaxseed', 'ground flaxseed'),
  ('Flaxseed', 'flaxseed meal'),
  ('Peas', 'pea fiber'),
  ('Peas', 'split peas'),
  ('Lentils', 'lentil'),
  ('Mixed tocopherols (preservative)', 'mixed tocopherols'),
  ('Mixed tocopherols (preservative)', 'tocopherols'),
  ('Lamb', 'lamb meal'),
  ('Turkey', 'turkey meal'),
  ('Salmon', 'salmon meal'),
  ('Venison', 'venison meal')
) as v(ingredient, alias)
join public.food_ingredients i on i.name = v.ingredient
on conflict (alias) do nothing;

-- ─────────────────────────── product ingredient decks ───────────────────────
insert into public.food_product_ingredients (product_id, ingredient_id, position)
select p.id, i.id, v.position
from (values
  ('Puppy Growth Formula', 'Chicken meal', 1), ('Puppy Growth Formula', 'Brown rice', 2), ('Puppy Growth Formula', 'Chicken fat', 3), ('Puppy Growth Formula', 'Egg', 4),
  ('Renal Support Wet', 'Turkey', 1), ('Renal Support Wet', 'Brown rice', 2), ('Renal Support Wet', 'Pumpkin', 3),
  ('Senior Lamb & Sweet Potato', 'Lamb', 1), ('Senior Lamb & Sweet Potato', 'Sweet potato', 2), ('Senior Lamb & Sweet Potato', 'Brown rice', 3), ('Senior Lamb & Sweet Potato', 'Flaxseed', 4),
  ('Beef & Barley Dinner', 'Beef', 1), ('Beef & Barley Dinner', 'Barley', 2), ('Beef & Barley Dinner', 'Carrots', 3), ('Beef & Barley Dinner', 'Beef meal', 4),
  ('Grain-Free Duck & Lentil', 'Duck', 1), ('Grain-Free Duck & Lentil', 'Lentils', 2), ('Grain-Free Duck & Lentil', 'Peas', 3), ('Grain-Free Duck & Lentil', 'Sweet potato', 4),
  ('Freeze-Dried Beef Morsels', 'Beef', 1), ('Freeze-Dried Beef Morsels', 'Pumpkin', 2), ('Freeze-Dried Beef Morsels', 'Mixed tocopherols (preservative)', 3),
  ('Turkey & Pumpkin Recipe', 'Turkey', 1), ('Turkey & Pumpkin Recipe', 'Pumpkin', 2), ('Turkey & Pumpkin Recipe', 'Carrots', 3), ('Turkey & Pumpkin Recipe', 'Salmon oil', 4),
  ('LID Salmon & Sweet Potato', 'Salmon', 1), ('LID Salmon & Sweet Potato', 'Sweet potato', 2), ('LID Salmon & Sweet Potato', 'Flaxseed', 3),
  ('Venison & Pea LID', 'Venison', 1), ('Venison & Pea LID', 'Peas', 2), ('Venison & Pea LID', 'Pumpkin', 3),
  ('Everyday Chicken & Corn', 'Chicken by-product meal', 1), ('Everyday Chicken & Corn', 'Corn', 2), ('Everyday Chicken & Corn', 'Wheat', 3), ('Everyday Chicken & Corn', 'Brewers rice', 4), ('Everyday Chicken & Corn', 'Caramel color', 5), ('Everyday Chicken & Corn', 'BHA/BHT (preservative)', 6),
  ('Beefy Bites Treats', 'Beef', 1), ('Beefy Bites Treats', 'Soy', 2), ('Beefy Bites Treats', 'Caramel color', 3), ('Beefy Bites Treats', 'Salt', 4),
  ('Sardine & Kelp Cat Food', 'Sardines', 1), ('Sardine & Kelp Cat Food', 'Kelp', 2), ('Sardine & Kelp Cat Food', 'Brown rice', 3),
  ('Indoor Chicken Recipe', 'Chicken', 1), ('Indoor Chicken Recipe', 'Brewers rice', 2), ('Indoor Chicken Recipe', 'Corn', 3), ('Indoor Chicken Recipe', 'Chicken fat', 4),
  ('Kitten Salmon Pate', 'Salmon', 1), ('Kitten Salmon Pate', 'Chicken liver', 2), ('Kitten Salmon Pate', 'Salmon oil', 3),
  ('Wild Boar & Apple', 'Wild boar', 1), ('Wild Boar & Apple', 'Apple', 2), ('Wild Boar & Apple', 'Sweet potato', 3), ('Wild Boar & Apple', 'Flaxseed', 4),
  ('Joint Support Supplement', 'Glucosamine', 1), ('Joint Support Supplement', 'Chondroitin', 2), ('Joint Support Supplement', 'Salmon oil', 3),
  ('Hairball Control Chicken', 'Chicken', 1), ('Hairball Control Chicken', 'Brewers rice', 2), ('Hairball Control Chicken', 'Pumpkin', 3), ('Hairball Control Chicken', 'Flaxseed', 4)
) as v(product, ingredient, position)
join public.food_products p on p.name = v.product
join public.food_ingredients i on i.name = v.ingredient
on conflict (product_id, ingredient_id) do nothing;

-- ─────────────────────────── ingredient flags ───────────────────────
insert into public.ingredient_flags (ingredient_id, flag_type, severity, message)
select i.id, v.flag_type, v.severity, v.message
from (values
  ('Chicken',                 'allergen',     'watch', 'Chicken is a common protein allergen — check your pet''s history'),
  ('Chicken by-product meal', 'quality',      'watch', 'By-product meal is a less specific, lower-cost protein source'),
  ('Chicken liver',           'organ',        'good',  'Organ meat — nutrient dense and palatable'),
  ('Beef',                    'allergen',     'watch', 'Beef is one of the most common canine protein allergens'),
  ('Beef meal',               'protein',      'good',  'Named meat meal — a concentrated protein source'),
  ('Corn',                    'filler',       'watch', 'Corn is an inexpensive carbohydrate filler'),
  ('Wheat',                   'allergen',     'watch', 'Wheat is a common grain allergen for some pets'),
  ('Soy',                     'allergen',     'watch', 'Soy is a plant protein and common allergen'),
  ('Brewers rice',            'filler',       'watch', 'Brewers rice is a milling fragment — a lower-quality carb'),
  ('Caramel color',           'additive',     'watch', 'Artificial coloring with no nutritional value'),
  ('BHA/BHT (preservative)',  'preservative', 'bad',   'BHA/BHT are artificial preservatives many owners prefer to avoid'),
  ('Duck',                    'protein',      'good',  'Novel protein — often well tolerated by sensitive pets'),
  ('Venison',                 'protein',      'good',  'Novel protein — useful for elimination diets'),
  ('Wild boar',               'protein',      'good',  'Novel protein — useful for sensitive pets'),
  ('Turkey',                  'protein',      'good',  'Lean, named protein'),
  ('Sardines',                'protein',      'good',  'Whole fish — naturally rich in omega-3s'),
  ('Sweet potato',            'carb',         'good',  'Digestible complex carbohydrate'),
  ('Pumpkin',                 'fiber',        'good',  'Gentle fiber source that supports digestion'),
  ('Glucosamine',             'supplement',   'good',  'Commonly used to support joint health'),
  ('Salmon oil',              'fat',          'good',  'Omega-3 source for skin and coat'),
  ('Flaxseed',                'fiber',        'good',  'Plant omega-3 and fiber')
) as v(ingredient, flag_type, severity, message)
join public.food_ingredients i on i.name = v.ingredient
where not exists (
  select 1 from public.ingredient_flags f where f.ingredient_id = i.id and f.message = v.message
);

-- ─────────────────────────── nutrition profiles ───────────────────────
insert into public.nutrition_profiles (product_id, protein_pct, fat_pct, fiber_pct, moisture_pct, kcal_per_100g)
select p.id, v.protein, v.fat, v.fiber, v.moisture, v.kcal
from (values
  ('Puppy Growth Formula',       29, 18, 4,   10, 410),
  ('Senior Lamb & Sweet Potato', 22, 11, 4.5, 10, 330),
  ('Beef & Barley Dinner',       24, 14, 4,   10, 360),
  ('Grain-Free Duck & Lentil',   27, 15, 5,   10, 375),
  ('Freeze-Dried Beef Morsels',  40, 28, 2,   5,  520),
  ('Turkey & Pumpkin Recipe',    10, 6,  1.5, 75, 110),
  ('LID Salmon & Sweet Potato',  24, 14, 4,   10, 355),
  ('Venison & Pea LID',          25, 14, 5,   10, 360),
  ('Everyday Chicken & Corn',    21, 12, 5,   10, 340),
  ('Beefy Bites Treats',         28, 16, 2,   16, 400),
  ('Sardine & Kelp Cat Food',    11, 6,  1,   76, 105),
  ('Indoor Chicken Recipe',      30, 12, 4,   9,  365),
  ('Kitten Salmon Pate',         12, 8,  1,   74, 125),
  ('Wild Boar & Apple',          26, 15, 4,   10, 370),
  ('Joint Support Supplement',   18, 10, 2,   8,  300),
  ('Hairball Control Chicken',   30, 11, 7,   9,  350)
) as v(product, protein, fat, fiber, moisture, kcal)
join public.food_products p on p.name = v.product
on conflict (product_id) do nothing;

-- ─────────────────────────── evidence sources ───────────────────────
insert into public.evidence_sources (title, publisher, url, source_type, summary) values
  ('Open Pet Food Facts', 'Open Food Facts (community)', 'https://world.openpetfoodfacts.org', 'database', 'Open, community-maintained product database used to identify pet foods by barcode and label.'),
  ('Petwell Demo Lab Dataset', 'Petwell (demo / seed data)', null, 'demo', 'Illustrative, fictional lab results included only to demonstrate the feature. NOT real testing — do not use to judge any real product.')
on conflict do nothing;

-- ─────────────────────────── DEMO lab evidence ───────────────────────
-- Every row is fictional (is_demo = true), cites the demo dataset, and carries an
-- explicit status. One product intentionally shows an "elevated" result to
-- demonstrate the caution path. None of this is a real measurement.
insert into public.contaminant_tests (product_id, substance, substance_category, result, status, tested_at, lab, is_demo, evidence_source_id)
select p.id, v.substance, v.category, v.result, v.status, v.tested_at::date,
       'Petwell demo dataset — illustrative only, not a real lab result', true, es.id
from (values
  ('Lamb & Rice Recipe',        'Lead',           'heavy_metal', 'Below detection limit',         'pass',     '2026-04-10'),
  ('LID Salmon & Sweet Potato', 'Mercury',        'heavy_metal', 'Within reference limits',       'pass',     '2026-03-22'),
  ('Freeze-Dried Beef Morsels', 'Salmonella',     'pathogen',    'Not detected (lot tested)',     'pass',     '2026-05-01'),
  ('Wild Boar & Apple',         'Cadmium',        'heavy_metal', 'Within reference limits',       'pass',     '2026-02-18'),
  ('Everyday Chicken & Corn',   'Lead',           'heavy_metal', 'Elevated vs. reference (demo)',  'elevated', '2026-01-15'),
  ('Everyday Chicken & Corn',   'Aflatoxin',      'mycotoxin',   'Within limits',                 'pass',     '2026-01-15')
) as v(product, substance, category, result, status, tested_at)
join public.food_products p on p.name = v.product
cross join (select id from public.evidence_sources where title = 'Petwell Demo Lab Dataset' limit 1) es;

-- Backfill status/category/source on the two original (0006) demo lab rows.
update public.contaminant_tests ct set
  substance_category = case when ct.substance ilike '%metal%' then 'heavy_metal' else 'mycotoxin' end,
  status = 'pass',
  is_demo = true,
  evidence_source_id = (select id from public.evidence_sources where title = 'Petwell Demo Lab Dataset' limit 1)
where ct.status is null;

-- ─────────────────────────── recalls ───────────────────────
insert into public.recall_events (brand_id, recall_date, reason, severity, source_url, evidence_source_id)
select b.id, '2025-11-03'::date,
  'Voluntary recall — potential Salmonella contamination in select lots',
  'bad',
  'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals',
  (select id from public.evidence_sources where title = 'FDA Pet Food Recalls & Withdrawals' limit 1)
from public.food_brands b
where b.name = 'Budget Bites'
  and not exists (select 1 from public.recall_events r where r.brand_id = b.id);

-- ─────────────────────────── evidence links (citations) ───────────────────────
-- Every product cites AAFCO (nutrient basis) and Open Pet Food Facts (identity).
insert into public.evidence_links (product_id, evidence_source_id, relation)
select p.id, es.id, 'aafco'
from public.food_products p
cross join (select id from public.evidence_sources where title like 'AAFCO%' limit 1) es
where not exists (select 1 from public.evidence_links el where el.product_id = p.id and el.evidence_source_id = es.id);

insert into public.evidence_links (product_id, evidence_source_id, relation)
select p.id, es.id, 'identification'
from public.food_products p
cross join (select id from public.evidence_sources where title = 'Open Pet Food Facts' limit 1) es
where not exists (select 1 from public.evidence_links el where el.product_id = p.id and el.evidence_source_id = es.id);

-- Products with demo lab rows cite the demo dataset.
insert into public.evidence_links (product_id, evidence_source_id, relation)
select distinct ct.product_id, ct.evidence_source_id, 'lab'
from public.contaminant_tests ct
where ct.product_id is not null and ct.evidence_source_id is not null
  and not exists (
    select 1 from public.evidence_links el
    where el.product_id = ct.product_id and el.evidence_source_id = ct.evidence_source_id
  );

-- Brands with recalls cite the FDA source.
insert into public.evidence_links (brand_id, evidence_source_id, relation)
select distinct re.brand_id, re.evidence_source_id, 'recall'
from public.recall_events re
where re.brand_id is not null and re.evidence_source_id is not null
  and not exists (
    select 1 from public.evidence_links el
    where el.brand_id = re.brand_id and el.evidence_source_id = re.evidence_source_id
  );
