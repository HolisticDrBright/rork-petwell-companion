-- Petwell · 0013 integrative catalog seed (mirrors lib/integrative)
-- Demo/reference data. Safety logic is enforced in app code; this is the
-- queryable catalog + condition templates.

insert into public.evidence_grades (grade, label, description) values
  ('A','Strong','Supported by controlled veterinary studies or established practice.'),
  ('B','Moderate','Supported by some studies plus a sound mechanism.'),
  ('C','Limited / emerging','Small studies or plausible traditional use.'),
  ('D','Traditional','Historical / TCM use with minimal modern data.')
on conflict (grade) do nothing;

insert into public.biological_systems (slug, label, description) values
  ('gut','Gut & digestion','Microbiome, food sensitivity, digestive inflammation, maldigestion.'),
  ('skin','Skin & allergy','Allergic/atopic inflammation, barrier dysfunction, damp-heat (TCM).'),
  ('hepatic','Pancreas, liver & gallbladder','Fat maldigestion, hepatic stress, biliary stagnation.'),
  ('renal','Kidney & urinary','Hydration, lower-urinary inflammation, renal workload.'),
  ('immune','Immune & inflammation','Inflammatory balance, oxidative stress, immune regulation.'),
  ('metabolic','Endocrine & metabolic','Weight/insulin regulation, metabolic reserve, thyroid (vet-led).'),
  ('msk','Musculoskeletal & pain','Joint wear, soft-tissue strain, stiffness (TCM Wind-Damp).'),
  ('dental','Dental & oral','Periodontal inflammation, oral pain.'),
  ('behavior','Stress & behavior','Stress/anxiety response, gut-brain axis, environment.')
on conflict (slug) do nothing;

insert into public.system_patterns (system_id, name)
select s.id, v.name from (values
  ('gut','Microbiome imbalance (dysbiosis)'),('gut','Food sensitivity'),('gut','Digestive inflammation'),
  ('skin','Allergic / atopic inflammation'),('skin','Damp-heat pattern (TCM)'),('skin','Skin-barrier dysfunction'),
  ('hepatic','Fat maldigestion'),('hepatic','Hepatic stress'),('hepatic','Biliary stagnation (TCM: Liver Qi)'),
  ('renal','Dehydration / concentrated urine'),('renal','Lower-urinary inflammation'),
  ('immune','Over-active inflammatory response'),('immune','Oxidative stress'),
  ('metabolic','Weight / insulin dysregulation'),('metabolic','Low metabolic reserve'),
  ('msk','Joint wear / osteoarthritis'),('msk','Stiffness (TCM: Wind-Damp / Blood stasis)'),
  ('dental','Periodontal inflammation'),('dental','Oral pain'),
  ('behavior','Stress / anxiety response'),('behavior','Gut-brain axis')
) as v(system_slug, name)
join public.biological_systems s on s.slug = v.system_slug;

insert into public.species_safety_rules (category, species, severity, rule) values
  ('herb','cat','caution','Cats lack key liver enzymes (glucuronidation) — most herbs need veterinary guidance and many are unsafe.'),
  ('supplement','cat','caution','Confirm species-appropriate product and dose with your vet before giving any supplement to a cat.'),
  ('herb','cat','avoid','Avoid in cats: essential oils, garlic/onion, turmeric in quantity, and most concentrated botanicals.'),
  ('food','cat','caution','Cats are obligate carnivores — limit carbohydrate "remedy" foods; never crash-diet or fast a cat.'),
  ('herb','dog','caution','Introduce one herb at a time and watch for GI upset; confirm with your vet if on medication.'),
  ('supplement','dog','safe','Most well-formulated supplements are reasonable for dogs, but dose to body weight and tell your vet.')
;

insert into public.supplement_ingredients (slug, name, benefit, systems, dog_safety, cat_safety, evidence_grade, ask_vet_first, source) values
  ('omega3','Omega-3 fish oil (EPA/DHA)','May help support skin barrier, joints, and balanced inflammation.','["skin","immune","msk","renal"]','safe','safe','B',false,'Veterinary nutrition reviews.'),
  ('probiotic','Multi-strain probiotic','May help support a balanced gut microbiome.','["gut","immune"]','safe','safe','B',false,'Veterinary probiotic trials.'),
  ('glucosamine','Glucosamine + chondroitin','May help support joint comfort and mobility.','["msk"]','safe','safe','B',false,'Osteoarthritis literature.'),
  ('l_theanine','Calming nutraceutical (L-theanine)','May help support calm behavior during stress.','["behavior"]','safe','caution','C',false,'Behavioral nutraceutical studies.'),
  ('digestive_enzymes','Digestive enzymes','May help support digestion under veterinary guidance.','["hepatic","gut"]','caution','caution','C',true,'Used for exocrine pancreatic insufficiency.'),
  ('cranberry','Cranberry extract','May help support lower-urinary-tract health.','["renal"]','safe','caution','C',false,'Urinary-adjunct literature.')
on conflict (slug) do nothing;

insert into public.herb_profiles (slug, name, benefit, systems, dog_safety, cat_safety, evidence_grade, ask_vet_first, thermal_nature, flavor, tcm_pattern, source) values
  ('milk_thistle','Milk thistle (silymarin)','May help support the liver during recovery.','["hepatic"]','caution','caution','C',true,'cooling','Bitter','Clears Damp-Heat; supports the Liver','Hepatoprotective traditional + emerging data.'),
  ('slippery_elm','Slippery elm bark','May help soothe the digestive tract (demulcent).','["gut"]','caution','caution','C',true,'neutral','Sweet','Moistens and soothes the Stomach','Traditional demulcent use.'),
  ('chamomile','Chamomile','May help support calm and mild digestive comfort.','["behavior","gut"]','caution','caution','D',true,'cooling','Bitter / sweet','Calms the Liver; clears mild Heat','Traditional calming use.'),
  ('turmeric','Turmeric / curcumin','May help support balanced inflammation in some dogs.','["msk","immune"]','caution','avoid','C',true,'warming','Bitter / pungent','Moves Blood and Qi; warms','Anti-inflammatory research.')
on conflict (slug) do nothing;

insert into public.natural_remedies (slug, name, kind, systems, benefit, evidence_grade, ask_vet_first, source) values
  ('pumpkin','Plain pumpkin (soluble fiber)','food','["gut"]','May help support stool consistency.','C',false,'Soluble-fiber guidance.'),
  ('bone_broth','Plain bone broth','food','["gut","msk"]','Hydrating and palatable; may help support intake during recovery.','D',false,'Supportive-nutrition practice.'),
  ('white_fish','Plain cooked white fish','food','["gut","renal"]','A gentle lean protein for bland recovery diets.','C',false,'Bland-diet practice.')
on conflict (slug) do nothing;

insert into public.tcm_food_properties (food, thermal_nature, flavor, tcm_pattern_support, species_safety, condition_contraindications, preparation_notes) values
  ('White fish (cod/pollock)','neutral','Sweet','Tonifies Qi; gentle on Spleen & Stomach','Dog & cat: safe','Fish allergy','Boil/steam plain — no oil, salt, onion, garlic.'),
  ('Bone broth','warming','Sweet / salty','Nourishes Yin & Blood; supports Spleen','Dog: safe; cat: low-sodium only','Must be onion/garlic-free, low-sodium','Simmer plain; cool; skim fat for low-fat needs.'),
  ('Sweet potato','neutral','Sweet','Tonifies Spleen Qi','Dog: safe; cat: minimal','Diabetic / weight management','Cooked, plain, mashed; small amounts.'),
  ('Pumpkin','neutral','Sweet','Harmonizes Spleen & Stomach; supports stool','Dog & cat: safe','None notable','Plain cooked purée; small spoonfuls.'),
  ('Sardines (in water)','warming','Salty / sweet','Tonifies Qi & Blood; warms','Dog & cat: safe (small)','Fish allergy; calories/sodium','Plain, in water; small portion as topper.'),
  ('Duck','cooling','Sweet / salty','Tonifies Yin; clears Heat','Dog & cat: safe','Poultry allergy','Plain cooked; remove skin/fat for low-fat needs.'),
  ('Chicken','warming','Sweet','Tonifies Qi & Blood; warms (may aggravate heat/itch)','Dog & cat: safe','Chicken allergy','Plain cooked; a common allergen.'),
  ('Lamb','warming','Sweet','Warms the Middle; tonifies Qi','Dog & cat: safe','Heat-pattern itch (warming)','Plain cooked, lean.');

insert into public.contraindications (item_slug, item_kind, contraindication) values
  ('omega3','supplement','Known bleeding disorder'),
  ('omega3','supplement','Scheduled surgery'),
  ('turmeric','herb','Bleeding disorder'),
  ('turmeric','herb','Gallbladder obstruction'),
  ('digestive_enzymes','supplement','Do NOT use during an acute pancreatitis flare'),
  ('cranberry','supplement','History of calcium-oxalate stones'),
  ('milk_thistle','herb','Pregnancy'),
  ('chamomile','herb','Ragweed-family allergy');

insert into public.medication_interactions (item_slug, item_kind, drug_class, note) values
  ('omega3','supplement','Anticoagulants','Additive bleeding risk — confirm with your vet.'),
  ('omega3','supplement','High-dose NSAIDs','Monitor for GI/bleeding effects.'),
  ('turmeric','herb','Anticoagulants','May increase bleeding risk.'),
  ('milk_thistle','herb','Liver-metabolized drugs','May alter drug metabolism — time separately.'),
  ('slippery_elm','herb','Oral medications','Can reduce absorption — give 1–2 hours apart.'),
  ('l_theanine','supplement','Sedatives / behavior meds','Additive sedation — confirm dose.');

insert into public.integrative_protocols (slug, title, system_slug, summary) values
  ('gut_support','Gut & digestion support','gut','Food-first gut reset, fiber, and microbiome support after vet clearance.'),
  ('skin_support','Skin & allergy support','skin','Elimination diet, omega-3s, barrier care, and trigger reduction.'),
  ('hepatic_support','Pancreas/liver support','hepatic','Low-fat, vet-led nutrition with cautious liver support.'),
  ('renal_support','Kidney & urinary support','renal','Hydration-forward nutrition and urinary monitoring.'),
  ('metabolic_support','Metabolic & weight support','metabolic','Calorie-controlled, vet-guided weight management.'),
  ('msk_support','Mobility support','msk','Lean weight, omega-3s, joint support, and gentle activity.'),
  ('behavior_support','Stress & behavior support','behavior','Routine, enrichment, gut-brain support, and calming nutraceuticals.')
on conflict (slug) do nothing;

insert into public.condition_meal_plans (slug, title, system_slug, pattern, base_urgency, red_flags, food_first, lifestyle, consider_items, what_to_track, when_to_ask_vet, notes, cat_guidance) values
  ('pancreatitis','Pancreatitis low-fat support','hepatic','Fat maldigestion / pancreatic inflammation','amber',
   '["Repeated vomiting","Severe belly pain","Not eating with lethargy","Collapse","Jaundice"]'::jsonb,
   '["Low-fat plan for dogs once cleared to eat","No fatty treats or table scraps","Hydration support"]'::jsonb,
   '["Scheduled portioned meals","Gradual healthy weight","Reduce mealtime stress"]'::jsonb,
   '["white_fish","probiotic","omega3","digestive_enzymes","milk_thistle"]'::jsonb,
   '["Appetite & meals","Vomiting episodes","Stool consistency","Energy","Weight weekly"]'::jsonb,
   '["Repeated vomiting/pain/not eating → vet now","Before any enzyme/herb/supplement","Relapse signs"]'::jsonb,
   '["Relapse often follows a high-fat meal within 24–72h","Build a food + stool/vomit log and export a vet report"]'::jsonb,
   'Feline pancreatitis is usually NOT managed with aggressive low-fat dieting; keeping a cat eating is critical. Never withhold food from a cat without veterinary advice.'),
  ('chronic_diarrhea','Chronic diarrhea gut-reset support','gut','Microbiome imbalance','amber',
   '["Blood/black stool","Repeated vomiting","Lethargy","Can''t keep water down","Very young/senior declining"]'::jsonb,
   '["Short bland gut-reset diet","Add soluble fiber (pumpkin)","Find diet triggers"]'::jsonb,
   '["Fresh water; watch hydration","Parasite prevention/fecal test","Avoid sudden diet changes"]'::jsonb,
   '["probiotic","pumpkin","white_fish","bone_broth","slippery_elm"]'::jsonb,
   '["Stool score & frequency","Food & treats","Water intake","Energy & appetite"]'::jsonb,
   '["Blood or repeated vomiting → vet now","Lasting >48–72h or recurring","Weight loss"]'::jsonb,
   '["Reintroduce regular diet slowly to avoid relapse"]'::jsonb, null),
  ('itchy_skin','Itchy skin / allergy support','skin','Allergic/atopic inflammation; damp-heat (TCM)','green',
   '["Facial swelling/hives or breathing trouble","Open/spreading sores","Severe pain or not eating"]'::jsonb,
   '["Vet-guided elimination diet","Consider novel/cooling protein","Omega-3-rich foods"]'::jsonb,
   '["Wipe paws after walks","Gentle vet-recommended bathing","Flea prevention","Reduce indoor allergens"]'::jsonb,
   '["omega3","sardines","duck","probiotic"]'::jsonb,
   '["Itch score 0–10","Affected areas + photos","Foods/new products","Flare timing"]'::jsonb,
   '["Swelling/hives/breathing → urgent","Infected sores or ear pain","No improvement after changes"]'::jsonb,
   '["Allergies are managed, not cured — consistency over weeks matters"]'::jsonb, null),
  ('kidney_hydration','Kidney hydration support','renal','Dehydration / renal workload','amber',
   '["Straining/unable to urinate (male cat) → emergency","Not eating with vomiting","Sudden weakness"]'::jsonb,
   '["Boost water content of meals","Vet kidney diet if diagnosed","Limit high-sodium foods"]'::jsonb,
   '["Multiple water stations / fountain","Track water & urination","Reduce stress"]'::jsonb,
   '["white_fish","bone_broth","omega3","cranberry"]'::jsonb,
   '["Water intake","Urination/straining/blood","Appetite & weight","Energy"]'::jsonb,
   '["Can''t urinate (male cat) → emergency now","Not eating/vomiting/lethargy","Blood in urine"]'::jsonb,
   '["A male cat that can''t urinate is a life-threatening emergency — go now"]'::jsonb, null),
  ('obesity_metabolic','Obesity / metabolic support','metabolic','Weight / insulin dysregulation','green',
   '["Sudden weakness/collapse/labored breathing","Excess thirst/urination with weight loss → vet"]'::jsonb,
   '["Measured portions to a calorie target","Satiety/weight diet","Smarter low-cal treats"]'::jsonb,
   '["Gradual activity increase","Weigh-ins every 2 weeks","Puzzle feeders"]'::jsonb,
   '["omega3","glucosamine"]'::jsonb,
   '["Weight every 1–2 weeks","Body condition score","Daily calories","Activity minutes"]'::jsonb,
   '["Before a plan (rule out metabolic disease)","Excess thirst/urination or rapid change","Breathing trouble"]'::jsonb,
   '["Aim for ~1–2% body weight loss per week"]'::jsonb,
   'Cats must lose weight slowly under veterinary supervision — rapid loss/fasting can cause hepatic lipidosis.'),
  ('arthritis','Arthritis mobility support','msk','Joint wear / osteoarthritis','green',
   '["Non-weight-bearing/dragging limb","Sudden severe pain or trauma","Wobbliness/incontinence → urgent"]'::jsonb,
   '["Reach and keep a lean weight","Omega-3-rich diet/topper"]'::jsonb,
   '["Gentle low-impact exercise","Ramps/non-slip rugs/orthopedic bed","Nail trims; warm rest area","Vet PT/acupuncture"]'::jsonb,
   '["glucosamine","omega3","sardines","turmeric"]'::jsonb,
   '["Mobility (stairs/jumping/stiffness)","Activity tolerance","Pain signs & weight","Response to changes"]'::jsonb,
   '["Non-weight-bearing/dragging → urgent","Before pain meds/supplements","No improvement or worsening"]'::jsonb,
   '["Never give human pain relievers — many are toxic; acetaminophen is fatal to cats"]'::jsonb, null),
  ('anxiety','Anxiety / stress support','behavior','Stress/anxiety response; gut-brain axis','green',
   '["Self-injury/panic/aggression risk","Not eating/drinking from stress","Sudden senior change → vet"]'::jsonb,
   '["Consistent meals + calm routine","Gut-brain support"]'::jsonb,
   '["Predictable routine + safe den","Enrichment (sniff walks, puzzles)","Desensitization for triggers","Pheromone diffuser"]'::jsonb,
   '["l_theanine","chamomile","probiotic"]'::jsonb,
   '["Trigger events & intensity","What calms them","Appetite & sleep","Episode frequency"]'::jsonb,
   '["Self-harm/panic/aggression → behavior vet","Sudden change (rule out pain)","Before calming supplements if on meds"]'::jsonb,
   '["Behavior change takes weeks — pair products with training"]'::jsonb, null)
on conflict (slug) do nothing;
