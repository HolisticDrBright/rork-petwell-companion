-- Petwell · 0006 reference catalog seed
-- Brand-neutral, fictional placeholder brands. Nothing here implies endorsement
-- or paid placement. Linked by name (not hardcoded ids) so it stays portable.

insert into public.food_brands (name, manufacturer, country) values
  ('Meadow & Main', 'Meadow & Main Pet Co. (sample)', 'USA'),
  ('Harvest Hound', 'Harvest Hound Foods (sample)', 'USA'),
  ('Coastal Catch', 'Coastal Catch (sample)', 'USA'),
  ('Whisker Wellness', 'Whisker Wellness (sample)', 'USA')
on conflict (name) do nothing;

insert into public.food_products (brand_id, name, product_type, species, form, calorie_density)
select b.id, v.name, v.product_type, v.species, v.form, v.calorie_density
from (values
  ('Meadow & Main',  'Lamb & Rice Recipe',     'food',  'dog', 'kibble', 'moderate'),
  ('Harvest Hound',  'Chicken & Pea Formula',  'food',  'dog', 'kibble', 'calorie-dense'),
  ('Harvest Hound',  'Puppy Growth Formula',   'food',  'dog', 'kibble', 'calorie-dense'),
  ('Coastal Catch',  'Salmon Chew Treats',     'treat', 'dog', 'chew',   'calorie-dense'),
  ('Whisker Wellness','Renal Support Wet',     'food',  'cat', 'wet',    'moderate')
) as v(brand, name, product_type, species, form, calorie_density)
join public.food_brands b on b.name = v.brand;

insert into public.food_ingredients (name, category) values
  ('Lamb', 'protein'),
  ('Brown rice', 'grain'),
  ('Chicken meal', 'protein'),
  ('Peas', 'legume'),
  ('Lentils', 'legume'),
  ('Pea protein', 'legume'),
  ('Salmon', 'protein'),
  ('Chicken fat', 'fat'),
  ('Mixed tocopherols (preservative)', 'additive')
on conflict (name) do nothing;

-- Chicken & Pea Formula ingredient deck (drives the food-label scan example).
insert into public.food_product_ingredients (product_id, ingredient_id, position)
select p.id, i.id, v.position
from (values
  ('Chicken & Pea Formula', 'Chicken meal', 1),
  ('Chicken & Pea Formula', 'Peas', 2),
  ('Chicken & Pea Formula', 'Lentils', 3),
  ('Chicken & Pea Formula', 'Chicken fat', 4),
  ('Lamb & Rice Recipe', 'Lamb', 1),
  ('Lamb & Rice Recipe', 'Brown rice', 2),
  ('Salmon Chew Treats', 'Salmon', 1),
  ('Salmon Chew Treats', 'Mixed tocopherols (preservative)', 2)
) as v(product, ingredient, position)
join public.food_products p on p.name = v.product
join public.food_ingredients i on i.name = v.ingredient
on conflict (product_id, ingredient_id) do nothing;

insert into public.ingredient_flags (ingredient_id, flag_type, severity, message)
select i.id, v.flag_type, v.severity, v.message
from (values
  ('Chicken meal', 'allergen', 'bad',   'Chicken protein may conflict with a chicken-sensitive pet'),
  ('Peas',         'legume',   'watch', 'High legume content — worth monitoring'),
  ('Lentils',      'legume',   'watch', 'High legume content — worth monitoring'),
  ('Pea protein',  'legume',   'watch', 'Plant protein boosting from legumes'),
  ('Salmon',       'protein',  'good',  'Novel protein — often well tolerated by allergy-prone pets'),
  ('Mixed tocopherols (preservative)', 'additive', 'good', 'Natural preservative')
) as v(ingredient, flag_type, severity, message)
join public.food_ingredients i on i.name = v.ingredient;

insert into public.nutrition_profiles (product_id, protein_pct, fat_pct, fiber_pct, moisture_pct, kcal_per_100g)
select p.id, v.protein_pct, v.fat_pct, v.fiber_pct, v.moisture_pct, v.kcal
from (values
  ('Chicken & Pea Formula', 26, 16, 4, 10, 380),
  ('Lamb & Rice Recipe',    23, 13, 3.5, 10, 350),
  ('Salmon Chew Treats',    32, 18, 2, 18, 410),
  ('Renal Support Wet',     8,  5,  1, 78, 95)
) as v(product, protein_pct, fat_pct, fiber_pct, moisture_pct, kcal)
join public.food_products p on p.name = v.product
on conflict (product_id) do nothing;

insert into public.manufacturer_quality_profiles (brand_id, owns_facilities, recall_count, transparency_score, notes)
select b.id, v.owns, v.recalls, v.score, v.notes
from (values
  ('Meadow & Main',    true,  0, 88, 'Owns manufacturing; publishes batch testing'),
  ('Harvest Hound',    false, 1, 64, 'Co-manufactured; one historical voluntary recall'),
  ('Coastal Catch',    true,  0, 80, 'Single-source protein; lot-level traceability'),
  ('Whisker Wellness', true,  0, 85, 'Therapeutic line; veterinary formulation')
) as v(brand, owns, recalls, score, notes)
join public.food_brands b on b.name = v.brand
on conflict (brand_id) do nothing;

insert into public.contaminant_tests (product_id, substance, result, tested_at, lab)
select p.id, v.substance, v.result, v.tested_at::date, v.lab
from (values
  ('Chicken & Pea Formula', 'Aflatoxin', 'Not detected', '2026-04-12', 'Independent lab (sample)'),
  ('Salmon Chew Treats',    'Heavy metals', 'Within reference limits', '2026-03-02', 'Independent lab (sample)')
) as v(product, substance, result, tested_at, lab)
join public.food_products p on p.name = v.product;

insert into public.recall_events (brand_id, recall_date, reason, severity, source_url)
select b.id, v.recall_date::date, v.reason, v.severity, v.source_url
from (values
  ('Harvest Hound', '2024-08-19', 'Voluntary recall — potential moisture variance in one lot', 'watch', 'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals')
) as v(brand, recall_date, reason, severity, source_url)
join public.food_brands b on b.name = v.brand;

insert into public.evidence_sources (title, publisher, url, source_type, summary) values
  ('AAFCO Dog & Cat Food Nutrient Profiles', 'Association of American Feed Control Officials', 'https://www.aafco.org', 'guideline', 'Baseline nutrient adequacy standards used for "complete and balanced" claims.'),
  ('FDA Pet Food Recalls & Withdrawals', 'U.S. Food & Drug Administration', 'https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals', 'regulatory', 'Official recall and withdrawal notices for pet food and treats.'),
  ('WSAVA Global Nutrition Guidelines', 'World Small Animal Veterinary Association', 'https://wsava.org/global-guidelines/global-nutrition-guidelines', 'guideline', 'How to evaluate a pet food manufacturer and diet quality.'),
  ('ACVN Position on Diet & Skin Disease', 'American College of Veterinary Nutrition', 'https://www.acvn.org', 'study', 'Overview of food elimination trials for suspected food sensitivity.')
on conflict do nothing;
