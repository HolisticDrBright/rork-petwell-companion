#!/usr/bin/env python3
"""
Builds lab_evidence.csv, coa_sources.csv, no_public_coa_found.csv from the
hand-normalized COA/lab research findings (web research, 2026-06-25).

Controlled vocabularies (aligned to expo/lib/food/provenance.ts + migration 0016):
  source_type:    real_product_coa | batch_lot_coa | brand_level_lab_report |
                  brand_marketing_claim | third_party_lab_summary | public_study |
                  no_public_coa_found
  status:         pass | not_detected | elevated | fail | unknown
  evidence_level: product | brand | batch | study | claim_only
  evidence_status:verified_lab | brand_claim | open_database | needs_review |
                  no_public_coa_found

CONSERVATIVE GRADING RULES applied here (never overclaim):
  * verified_lab ONLY for independent published lab data (peer-reviewed/government
    studies, or an independent ISO-17025 certification with real results).
  * Brand-published numeric results (lab unnamed, no downloadable COA) = brand_claim,
    but source_type=brand_level_lab_report and the values are recorded.
  * A product merely NAMED in the Clean Label Project study (no per-product values
    public) = needs_review (NOT verified_lab) — purity is not established.
  * Per-lot COA *lookup tools* with no captured document = needs_review (batch_lot_coa).
  * Low-credibility sources (e.g. NaturalNews) = needs_review with a credibility flag.
  * Marketing/QA language = brand_claim / claim_only.
"""
import csv, datetime
A = "2026-06-25"

# columns
COLS = ["brand","product","product_type","species","life_stage","source_url",
        "source_type","lab_name","test_date","lot","substances","result_value",
        "unit","status","evidence_level","evidence_status","notes","accessed_date",
        "screenshot_pdf"]

def R(brand, product, ptype, species, url, stype, status, elevel, estatus, notes,
      lab="", test_date="", lot="", subs="", result="", unit="", life=""):
    return {"brand":brand,"product":product,"product_type":ptype,"species":species,
            "life_stage":life,"source_url":url,"source_type":stype,"lab_name":lab,
            "test_date":test_date,"lot":lot,"substances":subs,"result_value":result,
            "unit":unit,"status":status,"evidence_level":elevel,"evidence_status":estatus,
            "notes":notes,"accessed_date":A,"screenshot_pdf":""}

rows = []

# ───────────────────────── verified_lab : INDEPENDENT published evidence ──────────
rows += [
 R("Freshpet","Full portfolio (Clean Label Project Certified)","fresh","both",
   "https://cleanlabelproject.org/dog-food-study/","third_party_lab_summary","pass","brand",
   "verified_lab",
   "Only brand listed as Clean Label Project CERTIFIED in the Feb-2026 ISO-17025 study (independent testing for 100+ contaminants). Brand-level certification, not a per-lot COA.",
   lab="Ellipse Analytics (ISO 17025) via Clean Label Project", test_date="2026-02-12",
   subs="heavy metals; bisphenols; phthalates; acrylamide; pesticides; glyphosate"),

 R("Clean Label Project","Dry dog food category average (50 samples)","dry","dog",
   "https://cleanlabelproject.org/dog-food-study/","public_study","elevated","study",
   "verified_lab",
   "Independent ISO-17025 study: dry dog food averaged ~12.7x more lead and ~5.7x more arsenic than the human-consumables benchmark; highest single lead sample 1,576.5 ppb.",
   lab="Ellipse Analytics (ISO 17025)", test_date="2026-02-12",
   subs="lead; arsenic; cadmium; mercury",
   result="lead avg 180.1; arsenic avg 184.6; cadmium avg 68.5; mercury avg 3.8; max lead 1576.5", unit="ppb"),

 R("Clean Label Project","Fresh/frozen dog food category average (18 samples)","fresh","dog",
   "https://cleanlabelproject.org/dog-food-study/","public_study","not_detected","study",
   "verified_lab",
   "Fresh/frozen segment had the LOWEST contaminants of any segment, below the human-consumables benchmark; dry food had ~21x more lead than fresh/frozen.",
   lab="Ellipse Analytics (ISO 17025)", test_date="2026-02-12",
   subs="lead; arsenic; cadmium; mercury",
   result="lead avg 8.5; arsenic avg 13.9; cadmium avg 11.3; mercury avg 0.2", unit="ppb"),

 R("Study: Kim et al. heavy metals in OTC dry dog foods","51 over-the-counter dry dog foods","dry","dog",
   "https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2018.00264/full",
   "public_study","unknown","study","verified_lab",
   "Frontiers in Vet Science 2018 (doi:10.3389/fvets.2018.00264). Fish diets higher As/Cd/Hg; red-meat diets higher Pb. Concluded foods generally safe for chronic consumption with occasional Pb outliers.",
   lab="Frontiers in Veterinary Science, 2018", test_date="2018",
   subs="arsenic; cadmium; lead; mercury (ICP-MS)",
   result="red-meat median Pb 0.091; As 0.037; Cd 0.013; Hg 0.0012", unit="mg/Mcal"),

 R("Study: Koestel et al. BPA in canned dog food","2 canned diets (one labeled BPA-free); 14 dogs","wet","dog",
   "https://www.cliniciansbrief.com/article/bisphenol-bpa-serum-pet-dogs-fed-canned-dog-food",
   "public_study","elevated","study","verified_lab",
   "Sci Total Environ 2017;579:1804-1814. Both canned diets contained BPA incl. the 'BPA-free' one; serum BPA rose significantly after 2 weeks and correlated with microbiome changes.",
   lab="Science of the Total Environment, 2017", test_date="2017",
   subs="bisphenol A (BPA)", result="serum BPA increased significantly in all dogs", unit="ng/mL"),

 R("Study: Zhao et al. glyphosate in pet food (Cornell)","18 dog & cat foods, 8 manufacturers","dry","both",
   "https://news.cornell.edu/stories/2018/10/study-finds-glyphosate-cat-and-dog-food",
   "public_study","unknown","study","verified_lab",
   "Environmental Pollution 2018 (Cornell). ALL 18 feeds contained glyphosate incl. one GMO-free certified; levels ~ <1% of human acceptable daily intake.",
   lab="Environmental Pollution, 2018", test_date="2018",
   subs="glyphosate", result="~80 to 2000", unit="ug/kg"),

 R("Study: EWG PFAS in pet-food packaging","11 bags, 7 popular brands","dry","both",
   "https://www.ewg.org/news-insights/news/2022/11/quibble-kibbles-forever-chemicals-pet-food-packaging-add-perils-home",
   "public_study","elevated","study","verified_lab",
   "EWG Nov-2022 independent lab test of PACKAGING (total fluorine up to ~630 ppm); 7 PFAS detected. Purina Cat Chow Complete Chicken highest total PFAS (244.7 ppb). Migration into food not confirmed.",
   lab="Environmental Working Group, 2022", test_date="2022-11-03",
   subs="PFAS (PFBA, PFPeA, PFHxA, PFHpA, 6:2 FTCA, 6:2 diPAP, PFPrA); total fluorine",
   result="Purina Cat Chow 244.7 total PFAS; Kibbles 'n Bits 14.3", unit="ppb"),

 R("Study/Recall: FDA Sportmix aflatoxin (Midwestern Pet Foods)","Sportmix, Pro Pac, Nunn Better lots","dry","both",
   "https://www.fda.gov/animal-veterinary/outbreaks-and-advisories/fda-alert-certain-lots-sportmix-pet-food-recalled-potentially-fatal-levels-aflatoxin",
   "public_study","fail","study","verified_lab",
   "FDA/Missouri Dept Ag 2021: samples up to 558 ppb aflatoxin vs 20 ppb adulteration threshold; >130 dog deaths. Government lab-confirmed.",
   lab="U.S. FDA / Missouri Dept. of Agriculture, 2021", test_date="2021-01-26",
   lot="EXP <=07/09/22 with '05' Oklahoma plant code", subs="aflatoxins",
   result="up to 558 (threshold 20)", unit="ppb"),
]

# ───────────── brand_level_lab_report : brand-published REAL values (graded brand_claim) ────────
rows += [
 R("Wellness (WellPet)","Multiple SKUs (public 'Testing Results' page)","dry/wet","both",
   "https://www.wellnesspetfood.com/testing-results/","brand_level_lab_report","pass","brand",
   "brand_claim",
   "Brand publishes a PUBLIC per-product heavy-metal results table with values + test dates (e.g. Simple Duck & Oatmeal As 0.30/Cd 0.22/Pb 0.08/Hg 0.02 mg/kg, all below NRC/FDA MTLs). Strong transparency but third-party lab unnamed and no downloadable independent COA -> graded brand_claim, values recorded.",
   lab="third-party accredited lab (AOAC; unnamed)", test_date="2026-04-03",
   subs="arsenic; cadmium; lead; mercury",
   result="As 0.30; Cd 0.22; Pb 0.08; Hg 0.02 (example SKU)", unit="mg/kg"),

 R("Orijen / Acana (Champion Petfoods)","Dog & cat foods (3-yr averages)","dry","both",
   "https://championpetfoods.com/on/demandware.static/-/Sites-cpf-corp-Library/default/dw7ff1cd03/pdf/Champion%20Petfoods%20White%20Paper-Heavy%20Metals.pdf",
   "brand_level_lab_report","pass","brand","brand_claim",
   "Brand white paper (May 2017) reports 3-yr third-party AOAC averages well below NRC/FDA MTLs (dog As 0.89/Cd 0.09/Pb 0.23/Hg 0.02; cat As 1.36 mg/kg). Aggregate, dated 2017 (consider stale), labs unnamed -> brand_claim.",
   lab="two third-party labs (AOAC; unnamed)", test_date="2017-05-01",
   subs="arsenic; cadmium; lead; mercury",
   result="dog As 0.89; Cd 0.09; Pb 0.23; Hg 0.02 | cat As 1.36", unit="mg/kg"),
]

# ───────────── batch_lot_coa : real per-lot COA lookup tools (needs_review; no doc captured) ─────
rows += [
 R("Open Farm","Per-lot traceability + QC lab results","dry/wet/freeze-dried","both",
   "https://openfarmpet.com/pages/transparency","batch_lot_coa","unknown","batch","needs_review",
   "Real lot-code traceability tool: scan/enter the bag lot code to trace ingredients and DOWNLOAD per-run QC lab results (salmonella/E.coli/mycotoxin clearance). No specific lot COA captured here; verify with a real product lot.",
   lab="third-party QC lab (unnamed)", subs="Salmonella; E. coli; mycotoxins"),

 R("Stella & Chewy's","Per-lot COA lookup (Download Report)","freeze-dried raw","both",
   "https://www.stellaandchewys.com/pages/coa","batch_lot_coa","unknown","batch","needs_review",
   "Real Lot ID lookup with a 'Download Report' COA per package (pathogen testing). No specific lot captured; verify with a real lot number.",
   lab="independent lab (unnamed)", subs="Salmonella; E. coli"),

 R("Natural Balance","Per-batch results via 'Feed With Confidence'","dry/wet/treats","both",
   "https://www.naturalbalanceinc.com/feed-with-confidence/","batch_lot_coa","unknown","batch","needs_review",
   "Enter 10-digit UPC + 7-digit lot; a Registered Vet Tech sends batch test results (mycotoxins/pathogens) from ISO-17025 labs. Batch-specific but delivered on request, not auto-published.",
   lab="ISO 17025 food labs (unnamed)",
   subs="aflatoxin; DON; fumonisin; ochratoxin; zearalenone; Salmonella; STEC E. coli"),
]

# ───────────── needs_review : named-in-CLP-study (no per-product values) + low-credibility ────────
clp_named = [
 ("Purina Pro Plan","Sensitive Skin & Stomach Salmon & Rice; Shredded Blend; +others","dry","dog"),
 ("Purina ONE","Lamb & Rice / Chicken & Rice / True Instinct","dry","dog"),
 ("Purina Dog Chow","Chicken Adult Complete","dry","dog"),
 ("Pedigree","Complete Nutrition","dry","dog"),
 ("Royal Canin","Health Nutrition Small Breed","dry","dog"),
 ("Cesar","Small Breed","dry","dog"),
 ("Iams","Proactive Health Minichunks","dry","dog"),
 ("Hill's Science Diet","Small & Mini (marked CLP Purity Award) + Sensitive Stomach/Perfect Weight/Puppy","dry","dog"),
 ("Blue Buffalo","Life Protection Formula Adult; Wilderness Natural","dry","dog"),
 ("Kibbles 'n Bits","Mini Bits","dry","dog"),
 ("Rachael Ray Nutrish","Whole Health Blend","dry","dog"),
 ("Nature's Recipe","Grain Free","dry","dog"),
 ("Diamond Naturals","Skin & Coat Salmon & Potato","dry","dog"),
 ("Pure Balance","Wild & Free Salmon & Pea","dry","dog"),
 ("JustFoodForDogs","Fresh/frozen diets (in fresh category)","fresh","dog"),
]
for b,p,t,s in clp_named:
    rows.append(R(b,p,t,s,"https://cleanlabelproject.org/dog-food-category-tested-products/",
        "third_party_lab_summary","unknown","study","needs_review",
        "Product NAMED in the Clean Label Project ISO-17025 study list, but per-product contaminant values are NOT publicly disclosed (only category averages). Purity NOT established for this product. Hill's Science Diet Small & Mini flagged as a CLP 'Purity Award' product.",
        lab="Ellipse Analytics (ISO 17025) via Clean Label Project", test_date="2026-02-12",
        subs="heavy metals; phthalates; acrylamide; bisphenols; pesticides"))

rows.append(R("Friskies","Wet/canned (NaturalNews 'A-3' rating)","wet","cat",
    "https://labs.naturalnews.com/heavy-metals-chart-Foods-Pet-Foods.html",
    "third_party_lab_summary","unknown","brand","needs_review",
    "CREDIBILITY FLAG: NaturalNews/Forensic Food Lab gave Friskies a low-heavy-metals 'A-3' rating (numeric values email-gated). NaturalNews is not a peer-reviewed/credible scientific source; treat as unverified pending review.",
    lab="Natural News Forensic Food Lab (ICP-MS) - low credibility", subs="lead; arsenic; mercury; cadmium"))

# ───────────── brand_claim : marketing/QA language (no public COA/values) ─────────
brand_claims = [
 ("Royal Canin","https://www.royalcanin.com/us/about-us/quality-and-food-safety","Mars brand. States 100% of incoming raw materials analysed via internal lab network. No public COA."),
 ("Hill's Science Diet","https://www.avma.org/javma-news/2020-02-15/update-fda-says-hills-failed-follow-own-procedures","Post-2019 vitamin-D recall: states it tests every vitamin premix lot via a certified third-party lab. No public COA document."),
 ("Diamond Naturals (Diamond Pet Foods)","https://www.diamondpet.com/about/quality-assurance/","'Test and Hold' program; ISO-17025 microbiological lab; ~3,458 mycotoxin tests/week. No heavy-metal COA published; brand faces heavy-metals/BPA class action."),
 ("Kirkland Signature (Costco / made by Diamond)","https://www.costco.com/sustainability-chemical-management.html","Costco corporate chemical-management language (uses independent third parties), not pet-food-specific COA."),
 ("Nutro","https://www.nutro.com/about-us/pet-food-safety-and-quality","Tests every grain shipment for mycotoxins; 600+ daily QC checks at owned facilities. No public lab values."),
 ("Merrick","https://www.merrickpetcare.com/faqs","SQF Level 3; USDA NOP certified kitchens. No public COA/values."),
 ("Taste of the Wild (Diamond)","https://www.tasteofthewildpetfood.com/frequently-asked-questions/","Diamond 'Test and Hold'; periodic heavy-metal testing vs NRC. Prior heavy-metal lawsuits; 2012 Salmonella recall. No public values."),
 ("Weruva","https://www.weruva.com/tools/faq","Regular batch testing for pathogens/heavy metals/mercury/histamines/PCB; BRC + ISO 9001. No public values."),
 ("Ziwi Peak","https://us.ziwipets.com/blogs/faq/what-testing-does-ziwi-peak-go-through","NZ MPI HACCP; lab tests all production to EU limits; publishes typical analysis only."),
 ("Instinct (Nature's Variety)","https://instinctpetfood.com/faqs/","Pathogen-tests every batch + HPP; SQF certified. No public lot/COA lookup."),
 ("Fromm Family","https://frommfamily.com/about/question-and-answer/food-safety/testing-quality-and-food-safety/","Approved-supplier program + third-party finished-product pathogen testing (test-and-hold). No public values."),
 ("Victor","https://victorpetfood.com/quality-and-food-safety","SQF certified; every batch must test Salmonella-negative. 2023 Salmonella recall (Mid America). No public values."),
 ("Earthborn Holistic","https://www.earthbornholisticpetfood.com/quality-ingredients/","Tests incoming + finished for mycotoxins/Salmonella/melamine. 2021 Salmonella recall. No public values."),
 ("Halo","https://halopets.com/pages/halo-holistic","In-house + standard QC; GAP/MSC certified. 2015 cat-food mold recall. No public values."),
 ("Tiki Cat / Tiki Dog (Whitebridge)","https://www.catsexclusive.com/blog/tiki-cat-safe-sustainable","States salmon/tuna tested for heavy metals/mercury. Retailer-relayed; no published lab reports on official site."),
 ("The Honest Kitchen","https://www.thehonestkitchen.com/pages/quality-assurance","~1,500 lab tests/month; routine third-party testing for melamine/ethoxyquin/heavy metals + supplier COAs. No buyer-facing values."),
 ("I and Love and You","https://iandloveandyou.com/pages/faq","AAFCO feeding trials; participates in Clean Label Project. No brand-published values."),
 ("Solid Gold","https://solidgoldpet.com/pages/disclosure","Disclosure page describes annual/biannual heavy-metal testing + links a results page that would not render -> values unverifiable; downgraded to brand_claim."),
 ("Zignature (Pets Global)","https://zignature.com/faqs/","Feeding/taurine studies (Summit Ridge Partners Labs). No contaminant COA/values."),
 ("Nulo","https://nulo.com/our-standards","General food-safety claims only. NOTE: a search-summary claim that Nulo 'publishes full CoA per SKU' was checked against the site and NOT found -> rejected as unverified."),
 ("The Farmer's Dog","https://www.thefarmersdog.com/digest/heavy-metals-in-dog-food-what-you-need-to-know/","States recipes get regular third-party heavy-metal testing at/below AAFCO/FDA benchmarks; cited in CLP 'Clean Sixteen' 2026. No downloadable COA/values."),
 ("Ollie","https://blog.ollie.com/pet-food-safety/","States a COA is required for every lot (pathogens/mycotoxins/heavy metals/pesticides) but COAs are not published/downloadable."),
 ("Nom Nom","https://www.nomnomnow.com/vet/","Inspects every ingredient + tests for safety (Mars/Royal Canin standards). No public COA/values."),
 ("Smalls","https://www.smalls.com/blog/post/how-smalls-ensures-every-bite-is-safe-for-your-cat","Cooks to temp + daily USDA/FDA facility inspection + QC. No published contaminant report."),
 ("Sundays for Dogs","https://sundaysfordogs.com/ingredients","Air-drying kill step; USDA/FDA standards; reviews mention per-batch pathogen testing. No published COA/values."),
 ("Spot & Tango","https://www.spotandtango.com/blog/aafco-certified-dog-foods","Names real labs (New Jersey Feed Lab; Midwest Laboratories) for NUTRIENT/AAFCO testing, not contaminant COAs. No downloadable report."),
 ("JustFoodForDogs","https://company.justfoodfordogs.com/faq","States diets passed AAFCO feeding trials at a major university + meet NRC. No downloadable COA (see separate CLP study row)."),
 ("Freshpet","https://www.freshpet.com/our-commitment-to-you","20+ safety tests/batch, hourly micro testing, SQF certified. No published values (see separate CLP Certified row)."),
 ("Primal Pet Foods","https://www.primalpetfoods.com/pages/quality-guarantee","Third-party 'test and hold' per lot. FDA 2023 warning letter cited documentation/pathogen-control gaps. No public COAs."),
 ("Vital Essentials","https://www.vitalessentials.com/safety-commitment","HACCP + GFSI FSSC22000; QC sampling. No downloadable COA/lot results."),
 ("Steve's Real Food","https://stevesrealfood.com/how-is-steves-different/","Per-batch pathogen testing + HPP + periodic nutrient panels. No published values."),
 ("Greenies","https://www.greenies.com/blogs/what-were-barking-about-greenies/the-importance-of-canine-dental-health","Proprietary digestive-solubility safety testing; VOHC-accepted. No contaminant COA."),
 ("Milk-Bone","https://www.milkbone.com/frequently-asked-questions","Generic quality/safety assurance language. No public COA/testing."),
 ("Pup-Peroni","https://www.pupperoni.com/faqs","Generic quality/safety language. No public COA/testing."),
 ("Zuke's","https://www.zukes.com/faqs","'Hundreds of quality & safety checks.' No public COA/values."),
 ("Blue Dog Bakery","https://www.bluedogbakery.com/faq/","Sourcing/quality standards (no China sourcing). No public COA/testing."),
 ("Old Mother Hubbard (Wellness)","https://www.wellnesspetfood.com/old-mother-hubbard/","Wholesome-ingredient/oven-baked marketing. No public COA/testing."),
 ("Charlee Bear","https://charleebear.com/faqs/","Claims per-batch purity/quality verification; an unverified review claimed QR-linked aflatoxin/salmonella tests (not found on site)."),
 ("Full Moon","https://www.fullmoonpet.com/pages/full-moon-pet-faq","USDA/FDA human-grade kitchens. No public COA/testing values."),
 ("Bocce's Bakery","https://antelopepets.gorgias.help/en-US/have-any-of-bocces-products-ever-been-recalled-1090925","States no recalls + clean/limited ingredients. No public COA/testing."),
]
for b,u,n in brand_claims:
    sp = "both"
    rows.append(R(b,"brand-level","mixed",sp,u,"brand_marketing_claim","unknown","claim_only",
        "brand_claim", n))

# ───────────── no_public_coa_found : searched, nothing public ─────────
no_coa = [
 ("Purina Cat Chow","cat","https://newscenter.purina.com/Purina-Response-to-Online-Rumors","Checked Purina QA pages + web search; only general QA marketing, no COA. (EWG flagged its Complete Chicken packaging for PFAS - see study row.)"),
 ("Fancy Feast","cat","https://newscenter.purina.com/Purina-Response-to-Online-Rumors","Checked Purina pages + web search; QA marketing only, no COA."),
 ("Beneful","dog","https://newscenter.purina.com/Purina-Response-to-Online-Rumors","Checked Purina pages + web search; no public COA."),
 ("Alpo","dog","https://newscenter.purina.com/Purina-Response-to-Online-Rumors","Checked Purina pages + web search; no public COA."),
 ("Whiskas","cat","https://www.royalcanin.com/us/about-us/quality-and-food-safety","Mars brand; web search + Mars QA language; no public COA."),
 ("Sheba","cat","https://www.royalcanin.com/us/about-us/quality-and-food-safety","Mars brand; no public COA found via web search."),
 ("Eukanuba","dog","https://en.wikipedia.org/wiki/Eukanuba","Mars brand; web search; no public COA; not in CLP study."),
 ("Hill's Prescription Diet","both","https://www.avma.org/javma-news/2020-02-15/update-fda-says-hills-failed-follow-own-procedures","Same maker as Science Diet; no public per-product COA."),
 ("Authority (PetSmart)","both","https://cleanlabelproject.org/dog-food-category-tested-products/","PetSmart private label; web search + CLP list checked; no COA/lab doc."),
 ("American Journey (Chewy)","both","https://cleanlabelproject.org/dog-food-category-tested-products/","Chewy private label (made by Diamond); web search + CLP list checked; no public COA."),
 ("Canidae","both","https://www.canidae.com/","Searched COA/heavy-metals/'Goodness verified'; only general in-house testing claims; no published reports/lot lookup."),
 ("NutriSource (KLN/Tuffy's)","both","https://nutrisourcepetfoods.com/","Searched COA/heavy-metals/traceability; general quality claims only; no published reports/lot lookup."),
]
for b,sp,u,n in no_coa:
    rows.append(R(b,"brand-level","mixed",sp,u,"no_public_coa_found","unknown","claim_only",
        "no_public_coa_found", n))

# ── write lab_evidence.csv (full ledger) ──
with open("lab_evidence.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=COLS); w.writeheader(); w.writerows(rows)

# ── coa_sources.csv : positive evidence sources (anything that IS a source/doc/study) ──
pos_types={"real_product_coa","batch_lot_coa","brand_level_lab_report","third_party_lab_summary","public_study"}
src_cols=["brand","product","source_type","evidence_level","evidence_status","lab_name",
          "test_date","substances","result_value","unit","status","source_url","accessed_date","notes"]
with open("coa_sources.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=src_cols); w.writeheader()
    for r in rows:
        if r["source_type"] in pos_types:
            w.writerow({k:r[k] for k in src_cols})

# ── no_public_coa_found.csv ──
nc_cols=["brand","product","species","source_url","evidence_status","notes","accessed_date"]
with open("no_public_coa_found.csv","w",newline="",encoding="utf-8") as f:
    w=csv.DictWriter(f,fieldnames=nc_cols); w.writeheader()
    for r in rows:
        if r["source_type"]=="no_public_coa_found":
            w.writerow({k:r[k] for k in nc_cols})

# summary
from collections import Counter
print("lab_evidence rows:",len(rows))
print("by evidence_status:",dict(Counter(r["evidence_status"] for r in rows)))
print("by source_type:",dict(Counter(r["source_type"] for r in rows)))
print("coa_sources rows:",sum(1 for r in rows if r["source_type"] in pos_types))
print("no_public_coa rows:",sum(1 for r in rows if r["source_type"]=="no_public_coa_found"))
print("verified_lab rows:",sum(1 for r in rows if r["evidence_status"]=="verified_lab"))
