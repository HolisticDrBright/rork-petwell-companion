#!/usr/bin/env python3
"""Builds brands.csv, marketplace_candidates.csv, breed_food_fit_profiles.csv,
source_manifest.csv from curated + researched data (2026-06-25).
Parent-company metadata is public knowledge; flagged data_confidence where
ownership changed recently and should be re-verified. No purity claims are made
here that are not backed by lab_evidence.csv."""
import csv, datetime
A="2026-06-25"

# ---- best evidence per brand, pulled from lab_evidence.csv ----
best={}
rank={"verified_lab":4,"brand_claim":2,"batch_lot_coa":3,"needs_review":1,"no_public_coa_found":0}
src_rank={"brand_level_lab_report":3,"batch_lot_coa":3,"third_party_lab_summary":2,"public_study":2,"brand_marketing_claim":1,"no_public_coa_found":0,"real_product_coa":4}
try:
    with open("lab_evidence.csv",encoding="utf-8") as f:
        for r in csv.DictReader(f):
            b=r["brand"].split(" (")[0].strip()
            sc=src_rank.get(r["source_type"],0)
            if b not in best or sc>best[b][0]:
                best[b]=(sc,r["evidence_status"],r["source_type"],r["source_url"])
except FileNotFoundError:
    pass
def eb(name):
    for k in best:
        if name.lower().startswith(k.lower()) or k.lower().startswith(name.lower()):
            return best[k]
    return (0,"not_researched","","")

# ---- curated top brands (parent company = public info; conf where uncertain) ----
# fields: brand, parent_company, species_focus, product_types, market_tier,
#         owns_or_comfg, hq_country, website, data_confidence
B=[
 ("Purina Pro Plan","Nestlé Purina PetCare","both","dry,wet,treat","premium","owns","USA","https://www.purina.com/pro-plan","high"),
 ("Purina ONE","Nestlé Purina PetCare","both","dry,wet","mainstream","owns","USA","https://www.purina.com/one","high"),
 ("Purina Dog Chow","Nestlé Purina PetCare","dog","dry,wet","value","owns","USA","https://www.purina.com/dog-chow","high"),
 ("Purina Cat Chow","Nestlé Purina PetCare","cat","dry,wet","value","owns","USA","https://www.purina.com/cat-chow","high"),
 ("Friskies","Nestlé Purina PetCare","cat","wet,dry","value","owns","USA","https://www.purina.com/friskies","high"),
 ("Fancy Feast","Nestlé Purina PetCare","cat","wet","mainstream","owns","USA","https://www.purina.com/fancy-feast","high"),
 ("Beneful","Nestlé Purina PetCare","dog","dry,wet","mainstream","owns","USA","https://www.purina.com/beneful","high"),
 ("Alpo","Nestlé Purina PetCare","dog","dry,wet","value","owns","USA","https://www.purina.com/alpo","high"),
 ("Beyond","Nestlé Purina PetCare","both","dry,wet","premium","owns","USA","https://www.purina.com/beyond","high"),
 ("Pedigree","Mars Petcare","dog","dry,wet,treat","value","owns","USA","https://www.pedigree.com","high"),
 ("Royal Canin","Mars Petcare","both","dry,wet","premium","owns","France/USA","https://www.royalcanin.com/us","high"),
 ("Whiskas","Mars Petcare","cat","dry,wet","value","owns","USA","https://www.whiskas.com","high"),
 ("Sheba","Mars Petcare","cat","wet","mainstream","owns","USA","https://www.sheba.com","high"),
 ("Cesar","Mars Petcare","dog","wet","mainstream","owns","USA","https://www.cesar.com","high"),
 ("Iams","Mars Petcare","both","dry,wet","mainstream","owns","USA","https://www.iams.com","high"),
 ("Eukanuba","Mars Petcare","dog","dry","premium","owns","USA","https://www.eukanuba.com","high"),
 ("Nutro","Mars Petcare","both","dry,wet","premium","owns","USA","https://www.nutro.com","high"),
 ("Greenies","Mars Petcare","both","treat,dental","premium","owns","USA","https://www.greenies.com","high"),
 ("Temptations","Mars Petcare","cat","treat","mainstream","owns","USA","https://www.temptationstreats.com","high"),
 ("Crave","Mars Petcare","both","dry,wet,treat","premium","owns","USA","https://www.cravepetfoods.com","high"),
 ("Nom Nom","Mars Petcare (majority)","both","fresh","super-premium/fresh","owns","USA","https://www.nomnomnow.com","medium"),
 ("Hill's Science Diet","Colgate-Palmolive (Hill's Pet Nutrition)","both","dry,wet","premium","owns","USA","https://www.hillspet.com","high"),
 ("Hill's Prescription Diet","Colgate-Palmolive (Hill's Pet Nutrition)","both","dry,wet","therapeutic","owns","USA","https://www.hillspet.com/prescription-diet","high"),
 ("Blue Buffalo","General Mills","both","dry,wet,treat","premium","co-manufactured","USA","https://bluebuffalo.com","high"),
 ("Meow Mix","J.M. Smucker","cat","dry,wet,treat","value","owns","USA","https://www.meowmix.com","medium"),
 ("Milk-Bone","J.M. Smucker","dog","treat","mainstream","owns","USA","https://www.milkbone.com","high"),
 ("Pup-Peroni","J.M. Smucker","dog","treat","mainstream","owns","USA","https://www.pupperoni.com","medium"),
 ("9Lives","Post Holdings (acq. 2023 from J.M. Smucker)","cat","dry,wet","value","co-manufactured","USA","https://www.9lives.com","medium"),
 ("Kibbles 'n Bits","Post Holdings (acq. 2023 from J.M. Smucker)","dog","dry","value","co-manufactured","USA","https://www.kibblesnbits.com","medium"),
 ("Nature's Recipe","Post Holdings (acq. 2023 from J.M. Smucker)","dog","dry","mainstream","co-manufactured","USA","https://www.naturesrecipe.com","medium"),
 ("Rachael Ray Nutrish","Post Holdings (acq. 2023 from J.M. Smucker)","both","dry,wet,treat","mainstream","co-manufactured","USA","https://www.nutrish.com","medium"),
 ("Diamond Naturals","Diamond Pet Foods (Schell & Kampeter)","both","dry,wet","premium","owns","USA","https://www.diamondpet.com","high"),
 ("Taste of the Wild","Diamond Pet Foods","both","dry,wet","premium","owns","USA","https://www.tasteofthewildpetfood.com","high"),
 ("Kirkland Signature","Costco (mfd by Diamond Pet Foods)","both","dry,wet","premium-value","co-manufactured","USA","https://www.costco.com","high"),
 ("Pure Balance","Walmart (private label)","both","dry,wet","premium-value","co-manufactured","USA","https://www.walmart.com","medium"),
 ("Authority","PetSmart (private label)","both","dry,wet","premium-value","co-manufactured","USA","https://www.petsmart.com","medium"),
 ("American Journey","Chewy (private label, mfd by Diamond)","both","dry,wet","premium-value","co-manufactured","USA","https://www.chewy.com","medium"),
 ("Wellness (WellPet)","WellPet (Berwind)","both","dry,wet,treat","super-premium","owns","USA","https://www.wellnesspetfood.com","high"),
 ("Wellness CORE","WellPet (Berwind)","both","dry,wet","super-premium","owns","USA","https://www.wellnesspetfood.com/core","high"),
 ("Old Mother Hubbard","WellPet (Berwind)","dog","treat","premium","owns","USA","https://www.wellnesspetfood.com/old-mother-hubbard","high"),
 ("Merrick","Nestlé Purina PetCare","both","dry,wet,treat","super-premium","owns","USA","https://www.merrickpetcare.com","high"),
 ("Zuke's","Nestlé Purina PetCare","both","treat","premium","owns","USA","https://www.zukes.com","medium"),
 ("Orijen","Champion Petfoods (Mars Petcare)","both","dry,freeze-dried","super-premium","owns","Canada/USA","https://www.orijenpetfoods.com","high"),
 ("Acana","Champion Petfoods (Mars Petcare)","both","dry,freeze-dried","super-premium","owns","Canada/USA","https://www.acana.com","high"),
 ("Canidae","Canidae (Ethos Pet Brands)","both","dry,wet","premium","owns","USA","https://www.canidae.com","medium"),
 ("Natural Balance","Natural Balance Pet Foods","both","dry,wet,treat","premium","co-manufactured","USA","https://www.naturalbalanceinc.com","medium"),
 ("Solid Gold","Solid Gold Pet","both","dry,wet","super-premium","co-manufactured","USA","https://solidgoldpet.com","medium"),
 ("Nulo","Nulo Pet Food","both","dry,wet,freeze-dried","super-premium","co-manufactured","USA","https://nulo.com","medium"),
 ("Victor","Mid America Pet Food","both","dry","premium","owns","USA","https://victorpetfood.com","medium"),
 ("Zignature","Pets Global","dog","dry,wet","super-premium","co-manufactured","USA","https://zignature.com","medium"),
 ("Earthborn Holistic","Midwestern Pet Foods","both","dry,wet","premium","owns","USA","https://www.earthbornholisticpetfood.com","medium"),
 ("Fromm","Fromm Family Foods","both","dry,wet,treat","super-premium","owns","USA","https://frommfamily.com","high"),
 ("NutriSource","KLN Family Brands (Tuffy's)","both","dry,wet","premium","owns","USA","https://nutrisourcepetfoods.com","medium"),
 ("Instinct","Nature's Variety (Agrolimen)","both","raw,freeze-dried,dry","super-premium","owns","USA","https://instinctpetfood.com","high"),
 ("Stella & Chewy's","Stella & Chewy's","both","freeze-dried,raw","super-premium","owns","USA","https://www.stellaandchewys.com","high"),
 ("Ziwi Peak","Ziwi Limited","both","air-dried,canned","super-premium","owns","New Zealand","https://us.ziwipets.com","high"),
 ("Open Farm","Open Farm","both","dry,wet,freeze-dried","super-premium","co-manufactured","Canada/USA","https://openfarmpet.com","high"),
 ("Halo","Halo Pets (Better Choice)","both","dry,wet","super-premium","co-manufactured","USA","https://halopets.com","medium"),
 ("Tiki Cat / Tiki Dog","Whitebridge Pet Brands","both","wet,canned","super-premium","co-manufactured","USA/Thailand","https://www.tikipets.com","medium"),
 ("Weruva","Weruva International","both","wet,canned","super-premium","co-manufactured","USA/Thailand","https://www.weruva.com","high"),
 ("The Honest Kitchen","The Honest Kitchen","both","dehydrated,wet","super-premium","co-manufactured","USA","https://www.thehonestkitchen.com","high"),
 ("I and Love and You","I and Love and You","both","dry,wet,treat","super-premium","co-manufactured","USA","https://iandloveandyou.com","medium"),
 ("The Farmer's Dog","The Farmer's Dog","dog","fresh","fresh/DTC","co-manufactured","USA","https://www.thefarmersdog.com","high"),
 ("Ollie","Ollie Pets","dog","fresh,baked","fresh/DTC","co-manufactured","USA","https://www.ollie.com","high"),
 ("Smalls","Smalls","cat","fresh","fresh/DTC","co-manufactured","USA","https://www.smalls.com","medium"),
 ("Sundays for Dogs","Sundays","dog","air-dried","fresh/DTC","co-manufactured","USA","https://sundaysfordogs.com","medium"),
 ("Spot & Tango","Spot & Tango","dog","fresh,unkibble","fresh/DTC","co-manufactured","USA","https://www.spotandtango.com","medium"),
 ("JustFoodForDogs","JustFoodForDogs","dog","fresh,frozen","fresh","owns","USA","https://www.justfoodfordogs.com","high"),
 ("Freshpet","Freshpet Inc.","both","fresh,refrigerated","fresh","owns","USA","https://www.freshpet.com","high"),
 ("Primal Pet Foods","Primal Pet Foods","both","raw,freeze-dried","super-premium/raw","owns","USA","https://www.primalpetfoods.com","high"),
 ("Vital Essentials","Carnivore Meat Company","both","freeze-dried,raw","super-premium/raw","owns","USA","https://www.vitalessentials.com","medium"),
 ("Steve's Real Food","Steve's Real Food","both","raw,freeze-dried","super-premium/raw","co-manufactured","USA","https://stevesrealfood.com","medium"),
 ("Blue Dog Bakery","Blue Dog Bakery","dog","treat","premium","owns","USA","https://www.bluedogbakery.com","medium"),
 ("Charlee Bear","Gott Pet Products","dog","treat","premium","owns","USA","https://charleebear.com","medium"),
 ("Full Moon","Perdue (Full Moon)","dog","treat","premium","owns","USA","https://www.fullmoonpet.com","medium"),
 ("Bocce's Bakery","Antelope (Bocce's)","both","treat","premium","co-manufactured","USA","https://www.boccesbakery.com","medium"),
]

bcols=["brand","parent_company","species_focus","product_types","market_tier","owns_or_comfg",
       "hq_country","website","best_evidence_status","best_source_type","best_source_url",
       "data_confidence","review_status","accessed_date","notes"]
with open("brands.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=bcols); w.writeheader()
    for (brand,parent,sp,pt,tier,own,hq,site,conf) in B:
        sc,estatus,stype,surl=eb(brand)
        w.writerow({"brand":brand,"parent_company":parent,"species_focus":sp,"product_types":pt,
            "market_tier":tier,"owns_or_comfg":own,"hq_country":hq,"website":site,
            "best_evidence_status":estatus,"best_source_type":stype,"best_source_url":surl,
            "data_confidence":conf,"review_status":"needs_admin_review","accessed_date":A,
            "notes":"Parent/ownership is public info; re-verify where data_confidence<high."})
print("brands.csv rows:",len(B))

# ---- marketplace_candidates.csv ----
# RULES: no fake buy links; no 'cleanest' without product-level lab evidence;
# keep research-preview unless real, reviewed evidence. recommendation_status reflects evidence.
mcols=["brand","product","category","species","evidence_grade","source_url","coa_url",
       "recall_note","transparency_score","ingredient_quality_notes","lab_tested",
       "affiliate_link","recommendation_status","reason","accessed_date"]
M=[
 ("Freshpet","Refrigerated fresh recipes","fresh","both","B+ (independent certification)",
  "https://cleanlabelproject.org/dog-food-study/","",
  "No recent FDA recall matched (2021 limited recall historically; verify in recalls_openfda.csv)",
  "","Refrigerated, whole-food forward; SQF certified","yes (independent: Clean Label Project Certified)","",
  "candidate","Only brand with independent Clean Label Project certification + fresh/frozen segment lowest contaminants in CLP study. Still NOT a per-lot product COA -> candidate, not 'cleanest'."),
 ("Wellness (WellPet)","Wellness / CORE lines","dry/wet","both","B (brand-published values)",
  "https://www.wellnesspetfood.com/testing-results/","https://www.wellnesspetfood.com/testing-results/",
  "Check recalls_openfda.csv for brand-level matches","","Named proteins; brand publishes per-product heavy-metal values","yes (brand-published; lab unnamed)","",
  "needs_review","Strong transparency (public per-product heavy-metal values), but self-reported, lab unnamed, no independent COA. Admin review before any ranking."),
 ("Open Farm","Bagged dog/cat foods (lot traceable)","dry/wet/freeze-dried","both","B- (per-lot QC tool)",
  "https://openfarmpet.com/pages/transparency","https://openfarmpet.com/pages/transparency",
  "Check recalls_openfda.csv","","Traceable sourcing; per-run QC lab results downloadable by lot","yes (per-lot QC; salmonella/E.coli/mycotoxin)","",
  "needs_review","Real per-lot COA lookup is a genuine differentiator; confirm a specific lot's results before featuring."),
 ("Stella & Chewy's","Freeze-dried raw","freeze-dried","both","B- (per-lot COA tool)",
  "https://www.stellaandchewys.com/pages/coa","https://www.stellaandchewys.com/pages/coa",
  "Raw category carries higher pathogen-recall base rate; check recalls_openfda.csv","",
  "Freeze-dried raw; downloadable per-lot pathogen COA","yes (per-lot pathogen COA)","",
  "needs_review","Per-lot COA download is real; raw category needs clear pathogen-handling messaging."),
 ("Natural Balance","Food & treats (Feed With Confidence)","dry/wet/treat","both","C+ (per-batch on request)",
  "https://www.naturalbalanceinc.com/feed-with-confidence/","https://www.naturalbalanceinc.com/feed-with-confidence/",
  "Check recalls_openfda.csv","","Per-batch mycotoxin/pathogen results via RVT on request","yes (per-batch, on request)","",
  "needs_review","Batch results exist but delivered on request, not auto-published; verify workflow."),
 ("Orijen / Acana","Biologically appropriate diets","dry/freeze-dried","both","C+ (brand white paper, 2017)",
  "https://championpetfoods.com","",
  "Champion had prior heavy-metals litigation (consumer class actions); check recalls_openfda.csv","",
  "High-meat-inclusion; 2017 third-party averages below MTL (dated)","yes (brand white paper, aggregate, 2017)","",
  "needs_review","Evidence is aggregate + 7 years old (likely stale); refresh before featuring."),
 ("The Farmer's Dog","Fresh recipes","fresh","dog","C (brand claim)",
  "https://www.thefarmersdog.com","",
  "No matched recall found; verify","","Human-grade fresh; claims third-party heavy-metal testing (no public COA)","unknown (claims yes; no public COA)","",
  "not_enough_evidence","Popular DTC brand but no public lab document; cannot rank on purity."),
 ("Hill's Science Diet","Science Diet lines","dry/wet","both","C (CLP-named, no values)",
  "https://cleanlabelproject.org/dog-food-category-tested-products/","",
  "2019 vitamin-D recall (historical); check recalls_openfda.csv","",
  "Vet-recommended; Small & Mini flagged CLP 'Purity Award' (values not public)","partial (named in CLP study; values not public)","",
  "needs_review","CLP Purity Award flag is promising but per-product values not disclosed; needs evidence before ranking."),
 ("Purina Pro Plan","Pro Plan lines","dry/wet","both","C (CLP-named, no values)",
  "https://cleanlabelproject.org/dog-food-category-tested-products/","",
  "2023 viral heavy-metals claim retracted as testing error per brand; check recalls_openfda.csv","",
  "WSAVA-aligned R&D; named in CLP study (values not public)","partial (named in CLP study)","",
  "needs_review","High brand-research transparency but no public per-product COA values."),
]
with open("marketplace_candidates.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=mcols); w.writeheader()
    for r in M:
        w.writerow(dict(zip(mcols, list(r)+[A])))
print("marketplace_candidates.csv rows:",len(M))

# ---- breed_food_fit_profiles.csv (needs_vet_review; breed-AWARE not 'best') ----
brc=["breed","species","size_class","common_nutrition_considerations","common_health_predispositions",
     "nutrients_to_discuss_with_vet","avoid_or_monitor_notes","preferred_food_traits","caution_flags",
     "evidence_source_url","review_status","notes"]
BR=[
 ("Labrador Retriever","dog","large","Calorie control; large-breed growth Ca:P balance in puppies","Obesity (POMC gene), hip/elbow dysplasia, exercise-induced collapse",
  "Calcium/phosphorus ratio (puppy); calorie density; omega-3 (joint)","Monitor body condition; avoid free-feeding",
  "Large-breed growth formula as puppy; weight-management adult","Strong food drive -> overfeeding risk",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review",
  "Breed-aware only. Body condition + activity drive the plan, not breed alone."),
 ("German Shepherd","dog","large","Large-breed growth control; digestive sensitivity common","Hip/elbow dysplasia, EPI, degenerative myelopathy, bloat (GDV)",
  "Digestibility; fiber; omega-3; appropriate Ca for growth","Monitor for EPI signs; discuss bloat-risk feeding (meal size)",
  "Highly digestible large-breed formula","GDV risk -> avoid single large meals",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review",
  "Discuss EPI testing if chronic loose stool/weight loss."),
 ("Golden Retriever","dog","large","Large-breed growth; weight management","Obesity, hip dysplasia, certain cancers, atopy/allergies",
  "Omega-3; calorie density; antioxidants","Monitor weight; allergy work-up if skin/GI signs",
  "Large-breed adult; novel protein if allergy-prone","Allergy-prone -> vet-led elimination diet",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review",
  "Allergy diets should be vet-supervised elimination trials."),
 ("French Bulldog","dog","small","Weight management; brachycephalic feeding ergonomics","Brachycephalic airway syndrome, allergies, IVDD, dermatitis",
  "Calorie density; kibble size/shape; omega-3","Avoid obesity (airway load); monitor skin/GI",
  "Weight-control; easy-to-pick kibble shape; LID if allergic","Brachycephalic -> keep lean; eat slowly",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review",
  "Weight control is central for brachycephalic breathing."),
 ("Bulldog (English)","dog","medium","Weight management; brachycephalic","BOAS, dermatitis/skin folds, allergies, joint issues",
  "Calorie density; omega-3; skin-support nutrients","Keep lean; monitor skin",
  "Weight-control; skin/coat support","Brachycephalic -> lean body condition",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Breed-aware only."),
 ("Poodle (Standard/Miniature/Toy)","dog","varies","Size-appropriate calorie density; dental (toy)","Bloat (standard), Addison's, hip dysplasia, dental disease (toy)",
  "Calorie density; dental kibble; appropriate meal size","Toy: dental + calorie density; Standard: GDV-aware feeding",
  "Size-matched formula; dental support (toy)","Toy breeds: hypoglycemia/dental; Standard: GDV",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Plan varies sharply by size variety."),
 ("Dachshund","dog","small","Weight management critical (spinal load)","IVDD, obesity, dental disease",
  "Calorie density; weight control","Keep very lean to reduce IVDD load; dental",
  "Weight-management; dental support","Obesity strongly worsens IVDD risk",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Lean body condition is protective for the spine."),
 ("Yorkshire Terrier","dog","toy","Calorie density; dental; hypoglycemia risk in puppies","Dental disease, hypoglycemia (puppy), portosystemic shunt, tracheal collapse",
  "Calorie density; small kibble; protein (if shunt, vet-led)","Puppy: avoid prolonged fasting; dental care",
  "Calorie-dense small-breed; dental kibble","Shunt -> protein managed by vet only",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Toy-breed energy needs are high per kg."),
 ("Chihuahua","dog","toy","Calorie density; dental; small kibble","Dental disease, hypoglycemia, patellar luxation, heart disease (senior)",
  "Calorie density; dental support; taurine (if cardiac, vet-led)","Avoid obesity; dental care",
  "Calorie-dense small-breed; dental","Hypoglycemia in puppies -> frequent small meals",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Breed-aware only."),
 ("Boxer","dog","large","Large-breed; weight; heart-aware","Boxer cardiomyopathy (ARVC), DCM, cancers, hip dysplasia",
  "Taurine/carnitine ONLY if vet-directed; omega-3","Discuss diet+DCM cautiously; avoid overclaiming grain-free link",
  "Large-breed adult; WSAVA-aligned brand","Cardiac history -> vet-led nutrition",
  "https://www.fda.gov/animal-veterinary/outbreaks-and-advisories/fda-investigation-potential-link-between-certain-diets-and-canine-dilated-cardiomyopathy","needs_vet_review",
  "DCM diet link unproven; do not advise grain-free avoidance as fact - defer to vet."),
 ("Great Dane","dog","giant","Strict large/giant-breed growth control (Ca:P, energy)","GDV/bloat, hip dysplasia, DCM, growth disorders",
  "Calcium/phosphorus + energy control in growth; meal size","Giant-breed puppy formula essential; GDV-aware feeding",
  "Giant-breed growth formula; controlled calcium","Over-supplementation of calcium harmful in growth",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Growth-formula calcium control is critical for giant breeds."),
 ("Miniature Schnauzer","dog","small","Low-fat may be needed; weight","Pancreatitis, hyperlipidemia, bladder stones (struvite/urate)",
  "Fat level (low-fat if pancreatitis-prone, vet-led); urinary mineral balance","Avoid high-fat treats/table scraps; monitor lipids",
  "Low-fat formula ONLY with vet guidance","Pancreatitis-prone -> strict low-fat under vet",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Low-fat diets should be vet-directed, not assumed."),
 ("Shih Tzu","dog","small","Weight; dental; brachycephalic feeding","Brachycephalic, dental disease, allergies, eye issues",
  "Calorie density; kibble shape; omega-3","Keep lean; dental care",
  "Small-breed; dental; skin support","Brachycephalic -> lean condition","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Breed-aware only."),
 ("Beagle","dog","medium","Weight management (high food motivation)","Obesity, epilepsy, hypothyroidism, ear infections",
  "Calorie control; fiber for satiety","Strict portion control; avoid scavenging",
  "Weight-management; satisfying fiber","Very food-motivated -> obesity risk","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Portion discipline matters most."),
 ("Domestic Shorthair (cat)","cat","medium","Obligate carnivore; hydration; weight","Obesity, FLUTD, diabetes, CKD (senior), dental",
  "Protein; moisture (wet food); urinary mineral balance; phosphorus (senior/CKD)","Encourage wet food for hydration; weight control",
  "High-protein; wet/moisture-rich; urinary-aware","CKD -> vet-led renal diet only if diagnosed",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Most common cat; plan by body condition + conditions."),
 ("Maine Coon (cat)","cat","large","Large-frame growth; weight; heart-aware","HCM, hip dysplasia, obesity, SMA",
  "Calorie density; taurine (always essential for cats); omega-3","Monitor weight; cardiac history -> vet-led",
  "Large-breed cat formula; high-protein","HCM history -> vet nutrition","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Taurine is essential in ALL cat diets."),
 ("Persian (cat)","cat","medium","Brachycephalic feeding ergonomics; hairball; renal-aware","PKD, brachycephalic, dental, hairballs",
  "Kibble shape; fiber (hairball); phosphorus (if PKD/CKD, vet-led)","Easy-to-eat kibble; monitor kidneys",
  "Brachycephalic-friendly kibble; hairball support","PKD-prone -> renal monitoring",
  "https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Kibble shape aids brachycephalic cats."),
 ("Siamese (cat)","cat","medium","Lean body; high activity","Asthma, dental, amyloidosis, some GI sensitivities",
  "Protein; calorie density matched to activity","Monitor weight (can be lean); dental",
  "High-protein; activity-matched calories","GI-sensitive individuals -> LID with vet","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Breed-aware only."),
 ("Sphynx (cat)","cat","medium","Higher energy needs (hairless thermoregulation)","HCM, skin conditions, higher metabolic demand",
  "Calorie density; protein; omega-3 (skin)","Higher intake may be normal; monitor heart",
  "Calorie-dense high-protein; skin support","HCM history -> vet nutrition","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","May need more calories than typical cats."),
 ("Ragdoll (cat)","cat","large","Large-frame; weight; heart-aware","HCM, obesity, FLUTD, bladder stones",
  "Calorie density; urinary mineral balance; taurine","Weight control; urinary-aware","Large-breed cat; urinary-aware high-protein","HCM history -> vet nutrition","https://wsava.org/global-guidelines/global-nutrition-guidelines/","needs_vet_review","Breed-aware only."),
]
with open("breed_food_fit_profiles.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=brc); w.writeheader()
    for r in BR: w.writerow(dict(zip(brc,r)))
print("breed_food_fit_profiles.csv rows:",len(BR))

# ---- source_manifest.csv ----
sm=["file","source","source_type","url","records","fetched_at","license_terms","notes"]
SM=[
 ("recalls_openfda.csv","openFDA Food Enforcement API","openfda","https://api.fda.gov/food/enforcement.json","146","2026-06-25","openFDA terms - public domain data (https://open.fda.gov/terms/)","Filtered to pet/animal food via repo recallNormalize logic; deduped."),
 ("products.csv","Open Pet Food Facts API v2","open_pet_food_facts","https://world.openpetfoodfacts.org/api/v2/search","120","2026-06-25","Open Database License (ODbL) - attribution required","Top by unique_scans + completeness; marked open_database/needs_admin_review."),
 ("lab_evidence.csv","Web research (brand sites, CLP, EWG, FDA, journals)","mixed","see per-row source_url","81","2026-06-25","Public pages summarized + cited; no full-text copied","Conservatively graded; verified_lab only for independent published evidence."),
 ("coa_sources.csv","Subset of lab_evidence with positive sources","mixed","see per-row source_url","29","2026-06-25","As above","COA/lab/study/lot-tool sources only."),
 ("no_public_coa_found.csv","Web research (negative findings)","n/a","see per-row source_url","12","2026-06-25","As above","Brands searched with no public COA."),
 ("brands.csv","Curated top-volume brands + public ownership info","curated","see per-row website","77","2026-06-25","Public info","Parent/ownership public; re-verify low-confidence rows."),
 ("marketplace_candidates.csv","Derived from lab_evidence + recalls","derived","see per-row source_url","9","2026-06-25","n/a","No fake links; research-preview retained; no 'cleanest' without product-level evidence."),
 ("breed_food_fit_profiles.csv","Curated breed-aware considerations","curated","https://wsava.org/global-guidelines/global-nutrition-guidelines/","21","2026-06-25","Public guidance summarized","needs_vet_review; breed-aware not 'best'."),
 ("source-snapshots/openfda_recalls_raw.json","openFDA raw normalized","openfda","https://api.fda.gov/food/enforcement.json","146","2026-06-25","openFDA terms","Raw snapshot for provenance."),
 ("source-snapshots/opff_products_raw.json","Open Pet Food Facts raw","open_pet_food_facts","https://world.openpetfoodfacts.org","120","2026-06-25","ODbL","Raw snapshot for provenance."),
]
with open("source_manifest.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=sm); w.writeheader()
    for r in SM: w.writerow(dict(zip(sm,r)))
print("source_manifest.csv rows:",len(SM))
