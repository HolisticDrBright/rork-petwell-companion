/**
 * Graded supplement catalogue — Adored Beast + Dr. Judy Morgan.
 *
 * Source: Petwell product research, 2026-10-06 (60 products, catalogue pulled
 * the same day). Grades and actions are Petwell's own, assigned from the
 * evidence, not from the seller.
 *
 * Every `summary` here is written by Petwell. Store copy is not reused: it is
 * copyrighted, and it routinely makes claims ("heals", "cures", "prevents",
 * "detoxifies") that this app will not repeat. Where the honest answer is "no
 * trials exist", the summary says so.
 *
 * Bundled rather than fetched so an owner standing in a shop with no signal
 * still gets the grade and the caveat. The same rows are seeded to
 * `marketplace_products` (migration 0037) for the marketplace screen.
 *
 * PRICES GO STALE. They are recorded as of `CATALOG_PULLED` and shown as "price
 * when checked", never as a live price. Both stores are Shopify, so
 * /products.json re-pulls the live catalogue — see docs/DATA_REFRESH.md.
 */

import type { ProductCategory } from "@/lib/integrative/marketplace";
import type { EvidenceGrade } from "@/lib/integrative/types";

import type { ProductAction } from "./productSafety";

/** The date the catalogue behind these rows was pulled. */
export const CATALOG_PULLED = "2026-10-06";

/** Ailment vocabulary used by this catalogue (from the research doc). */
export type Ailment =
  | "joint"
  | "skin"
  | "itch"
  | "allergy"
  | "diarrhea"
  | "digestion"
  | "ibd"
  | "chronic_gi"
  | "stool"
  | "anal_glands"
  | "kidney"
  | "urinary"
  | "liver"
  | "detox"
  | "heart"
  | "cognition"
  | "immune"
  | "cancer_support"
  | "anxiety"
  | "sleep"
  | "dental"
  | "yeast"
  | "wounds"
  | "first_aid"
  | "fleas"
  | "ticks"
  | "infection"
  | "pain"
  | "longevity"
  | "wellness"
  | "vaccinosis";

export interface GradedProduct {
  id: string;
  name: string;
  brand: string;
  /** Which store the price and link came from. */
  store: "adoredbeast.com" | "drjudymorgan.com";
  url: string;
  /** USD, as of CATALOG_PULLED. Never shown as a live price. */
  priceUsd: number;
  /** "environment" = a yard/home product, not given to the pet. */
  species: ("dog" | "cat")[] | "environment";
  ailments: Ailment[];
  /** Which marketplace shelf it sits on. */
  category: ProductCategory;
  grade: EvidenceGrade;
  action: ProductAction;
  /** Ids into PRODUCT_SAFETY_RULES. */
  safetyRuleIds: number[];
  /** Petwell's own description. Never the seller's. */
  summary: string;
  /** A multi-product bundle; see KITS for what's inside. */
  isKit?: boolean;
}

export const GRADED_PRODUCTS: GradedProduct[] = [
  // ── Omega-3 — the best-evidenced category here ─────────────────────────────
  {
    id: "ab-potent-sea-omega3",
    name: "Potent-Sea Omega-3 (EPA & DHA)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/potent-sea-omega-3",
    priceUsd: 39.99,
    species: ["dog", "cat"],
    ailments: ["joint", "skin", "kidney", "heart", "cognition"],
    category: "omega3",
    grade: "A",
    action: "recommend",
    safetyRuleIds: [8],
    summary:
      "EPA and DHA from fish oil. Omega-3 has the strongest evidence of anything in this catalogue — established for arthritis comfort, and part of standard care in kidney and heart disease. Getting the dose right is the part that matters.",
  },
  {
    id: "iceland-pure-sardine-anchovy",
    name: "Unscented Sardine & Anchovy Oil",
    brand: "Iceland Pure",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/iceland-pure-unscented-sardine-anchovy-oil",
    priceUsd: 23.99,
    species: ["dog", "cat"],
    ailments: ["joint", "skin", "kidney", "heart"],
    category: "omega3",
    grade: "A",
    action: "recommend",
    safetyRuleIds: [8],
    summary:
      "Sardine and anchovy oil. Small, short-lived fish sit low in the food chain, which keeps accumulated contaminants down compared with larger species.",
  },
  {
    id: "iceland-pure-salmon",
    name: "Unscented Salmon Oil",
    brand: "Iceland Pure",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/iceland-pure-unscented-salmon-oil",
    priceUsd: 22.99,
    species: ["dog", "cat"],
    ailments: ["joint", "skin", "kidney", "heart"],
    category: "omega3",
    grade: "A",
    action: "recommend",
    safetyRuleIds: [8],
    summary:
      "Salmon oil from the same line. Between this and the sardine/anchovy version, pick whichever your pet will actually eat — the EPA and DHA are what count.",
  },

  // ── Joint ──────────────────────────────────────────────────────────────────
  {
    id: "drjudy-pea-40g",
    name: "PEA (Palmitoylethanolamide) 40 g",
    brand: "Dr. Judy Morgan's Naturally Healthy Pets",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/dr-judys-pea-palmitoylethanolamide-40g",
    priceUsd: 59.99,
    species: ["dog"],
    ailments: ["itch", "joint", "pain"],
    category: "supplements",
    grade: "B",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Palmitoylethanolamide, a fatty-acid compound the body makes itself, studied for itch and discomfort. The supporting study followed 160 dogs with atopic dermatitis but was open-label with no placebo group — good, not definitive, which is why it is a B.",
  },
  {
    id: "feline-essentials-pea",
    name: "Palmitoylethanolamide (PEA) 9 g",
    brand: "Feline Essentials",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/feline-essentials-palmitoylethanolamide-pea-14g",
    priceUsd: 29.99,
    species: ["cat"],
    ailments: ["itch", "pain"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "The cat formulation of PEA. The dog evidence is stronger than the cat evidence, so this sits a grade lower than the canine product.",
  },
  {
    id: "drjudy-wellness-formula",
    name: "Wellness Formula",
    brand: "Dr. Judy Morgan's Naturally Healthy Pets",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/dr-morgans-wellness-formula",
    priceUsd: 39.99,
    species: ["dog", "cat"],
    ailments: ["joint", "wellness"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Green-lipped mussel, deer velvet and colostrum. Green-lipped mussel has modest joint evidence behind it. Contains shellfish — skip it if your pet reacts to shellfish.",
  },
  {
    id: "drjudy-elk-velvet",
    name: "Elk Velvet Antler Powder 30 g",
    brand: "Dr. Judy Morgan's Naturally Healthy Pets",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/dr-judys-elk-velvet-antler-powder-30g",
    priceUsd: 49.99,
    species: ["dog"],
    ailments: ["joint"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Elk velvet antler, a traditional joint remedy with one small canine study behind it. Worth knowing it sits at C, not B.",
  },
  {
    id: "cosequin-for-cats",
    name: "Cosequin for Cats",
    brand: "Nutramax (via Covetrus)",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/cosequin-for-cats",
    priceUsd: 27.0,
    species: ["cat"],
    ailments: ["joint", "urinary"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Glucosamine and chondroitin formulated for cats. Joint trial results are mixed across the category, but it is long-established and well tolerated.",
  },
  {
    id: "woof-glm-treats",
    name: "Green Lipped Mussel Treats",
    brand: "The New Zealand Pet Food Co",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/woof-green-lipped-mussels-treats",
    priceUsd: 13.99,
    species: ["dog"],
    ailments: ["joint"],
    category: "treats",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Green-lipped mussel in treat form — an easy way to get it into a dog that refuses powders. Contains shellfish.",
  },
  {
    id: "ab-jump-for-joynts",
    name: "Jump for JOYnts",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/jump-for-joynts",
    priceUsd: 29.99,
    species: ["dog", "cat"],
    ailments: ["joint"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "A homeopathic joint product. Listed so you can see what's in the range; for joint comfort, fish oil is the one with trials behind it.",
  },

  // ── Gut: probiotics and soothers ───────────────────────────────────────────
  {
    id: "ab-fidos-flora",
    name: "Fido's Flora (canine probiotic)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/fidos-flora",
    priceUsd: 55.99,
    species: ["dog"],
    ailments: ["diarrhea", "allergy"],
    category: "probiotics",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "A probiotic built from strains originally isolated from dogs. Matching strains to the species is a sound idea; the randomised trials sit behind multi-strain probiotics generally rather than this specific blend.",
  },
  {
    id: "ab-felixs-flora",
    name: "Felix's Flora (feline probiotic)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/felixs-flora-species-appropriate-probiotic",
    priceUsd: 39.99,
    species: ["cat"],
    ailments: ["diarrhea", "allergy"],
    category: "probiotics",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "The cat equivalent, using feline-derived strains. Reasonable for loose stool; the evidence is small-study rather than randomised.",
  },
  {
    id: "ab-love-bugs",
    name: "Love Bugs (pre & probiotic)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/love-bugs",
    priceUsd: 31.99,
    species: ["dog", "cat"],
    ailments: ["diarrhea"],
    category: "probiotics",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "A 14-strain, 30-billion-CFU blend with prebiotic fibre. Multi-strain probiotics are the ones with actual trials for short-term diarrhoea in dogs.",
  },
  {
    id: "ab-the-wolf",
    name: "The Wolf (species-appropriate probiotic)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/wolf-strain-probiotic",
    priceUsd: 59.99,
    species: ["dog"],
    ailments: ["diarrhea"],
    category: "probiotics",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "A probiotic aimed at dogs on raw diets. Same evidence tier as the other multi-strain probiotics in this catalogue.",
  },
  {
    id: "ab-healthy-gut",
    name: "Healthy Gut (enzymes + pre & probiotic)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/healthy-gut",
    priceUsd: 34.99,
    species: ["dog", "cat"],
    ailments: ["diarrhea", "digestion"],
    category: "enzymes",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Probiotic and digestive enzymes in one powder. Added enzymes matter for diagnosed pancreatic insufficiency; for an ordinary upset stomach the probiotic is doing the work.",
  },
  {
    id: "ab-canine-gut-soothe",
    name: "Canine Gut Soothe",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/canine-gut-soothe",
    priceUsd: 34.99,
    species: ["dog"],
    ailments: ["diarrhea", "ibd"],
    category: "probiotics",
    grade: "C",
    action: "caution",
    safetyRuleIds: [7],
    summary:
      "30 billion CFU with slippery elm, L-glutamine and deglycyrrhizinated liquorice. The soothing ingredients coat the gut — which is exactly why they need spacing from medication.",
  },
  {
    id: "ab-feline-gut-soothe",
    name: "Feline Gut Soothe",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/feline-gut-soothe",
    priceUsd: 29.99,
    species: ["cat"],
    ailments: ["diarrhea", "ibd"],
    category: "probiotics",
    grade: "C",
    action: "caution",
    safetyRuleIds: [7],
    summary:
      "The cat formulation of Gut Soothe. Same caveat: it coats the gut, so keep it an hour or two away from oral medicines.",
  },
  {
    id: "ab-soil-and-sea",
    name: "Soil & Sea (primordial pre & probiotics)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/soil-sea-primordial-pre-and-probiotics",
    priceUsd: 55.99,
    species: ["dog", "cat"],
    ailments: ["diarrhea"],
    category: "probiotics",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "Soil-based organisms with marine prebiotics. Soil-based probiotics are popular and barely studied in dogs and cats — listed so you can see it, not recommended.",
  },
  {
    id: "now-s-boulardii",
    name: "Saccharomyces Boulardii, 60 capsules",
    brand: "NOW Foods",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/now",
    priceUsd: 21.99,
    species: ["dog", "cat"],
    ailments: ["diarrhea"],
    category: "probiotics",
    grade: "C",
    action: "recommend",
    // Human-label product → rule 10, added by Petwell (the source sheet noted it
    // in prose but did not tag the rule).
    safetyRuleIds: [10],
    summary:
      "A probiotic yeast rather than a bacterium, which is why it can be given alongside antibiotics. Reasonable evidence in acute and antibiotic-associated diarrhoea. A human product, so the dose comes from your vet.",
  },
  {
    id: "dr-harveys-runs-be-done",
    name: "Runs Be Done",
    brand: "Dr. Harvey's",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/dr-harveys-runs-be-done",
    priceUsd: 32.95,
    species: ["dog", "cat"],
    ailments: ["diarrhea"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary: "A herbal blend for loose stool. Traditional use; we found no trials in dogs or cats.",
  },
  {
    id: "kinkind-healthy-poops",
    name: "Organic Healthy Poops (pumpkin fibre)",
    brand: "kin+kind",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/kin-kind-pumpkin-fiber-bowel-supplement",
    priceUsd: 13.99,
    species: ["dog"],
    ailments: ["stool", "anal_glands"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Pumpkin-based fibre. Added fibre genuinely firms stool and helps some dogs empty their anal glands on their own — cheap and sensible to try before anything more involved.",
  },
  {
    id: "now-l-glutamine",
    name: "L-Glutamine, 6 oz",
    brand: "NOW Foods",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/now-l-glutamine-6-oz",
    priceUsd: 19.99,
    species: ["dog", "cat"],
    ailments: ["chronic_gi"],
    category: "supplements",
    grade: "C",
    action: "caution",
    // Rule 7 added by Petwell: rule 7 names L-glutamine powders explicitly.
    safetyRuleIds: [7, 10],
    summary:
      "L-glutamine, an amino acid the gut lining uses as fuel. A human product, and a gut-coating powder — so it needs both a vet dose and spacing from oral medicines.",
  },

  // ── Liver ──────────────────────────────────────────────────────────────────
  {
    id: "ab-liver-tonic",
    name: "Liver Tonic",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/liver-tonic",
    priceUsd: 29.99,
    species: ["dog", "cat"],
    ailments: ["liver", "detox"],
    category: "supplements",
    grade: "D",
    action: "caution",
    safetyRuleIds: [1, 2],
    summary:
      "Dandelion, milk thistle, barberry and greater celandine in glycerin. No trials in dogs or cats; milk thistle is the one ingredient with any support behind it. Greater celandine is the reason this carries a liver warning, and barberry is why it needs checking against any prescription.",
  },
  {
    id: "solutions-milk-thistle",
    name: "Milk Thistle, 8 oz",
    brand: "Solutions Pet Products",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/solutions-pet-products-milk-thistle-8oz",
    priceUsd: 45.99,
    species: ["dog", "cat"],
    ailments: ["liver"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [],
    summary:
      "Milk thistle (silybin), the best-studied liver herb there is. Still a C — the studies in dogs and cats are small.",
  },
  {
    id: "now-same-200",
    name: "SAMe 200 mg Capsules",
    brand: "NOW Foods",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/now-same-200-mg-capsules",
    priceUsd: 39.99,
    species: ["dog", "cat"],
    ailments: ["liver", "cognition"],
    category: "supplements",
    grade: "B",
    action: "vet_only",
    safetyRuleIds: [10],
    summary:
      "SAMe, used both in liver support and in canine cognitive decline. It has to be enteric-coated to survive the stomach, and it's a human tablet — the dose comes from your vet.",
  },
  {
    id: "rx-hepato-support",
    name: "Rx Hepato Support",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-hepato-support",
    priceUsd: 37.79,
    species: ["dog", "cat"],
    ailments: ["liver"],
    category: "supplements",
    grade: "C",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "A combined liver-support formula. Liver disease needs bloodwork and a diagnosis before any supplement — the numbers decide what helps.",
  },

  // ── Kidney ─────────────────────────────────────────────────────────────────
  {
    id: "rx-phos-bind",
    name: "Rx Phos-Bind",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-phos-bind",
    priceUsd: 27.3,
    species: ["dog", "cat"],
    ailments: ["kidney"],
    category: "supplements",
    grade: "B",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "A phosphate binder. Controlling phosphorus is one of the few interventions shown to extend life in chronic kidney disease — and it is dosed against a blood phosphorus level, which is why it can't be bought on a hunch.",
  },
  {
    id: "rx-renal-feline-beadlets",
    name: "Rx Renal Feline Beadlets, 100 g",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-renal-feline-beadlets-100g",
    priceUsd: 48.29,
    species: ["cat"],
    ailments: ["kidney"],
    category: "supplements",
    grade: "C",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "A feline kidney-support blend. It belongs inside a staged CKD plan built on bloodwork, not instead of one.",
  },
  {
    id: "aminavast-kidney",
    name: "AminAvast Kidney Support, 60 count",
    brand: "Bio-Vet (via Covetrus)",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/aminavast-kidney-support-for-cats",
    priceUsd: 37.0,
    species: ["cat", "dog"],
    ailments: ["kidney"],
    category: "supplements",
    grade: "C",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "An amino-acid based kidney support. Small studies behind it; it sits alongside a vet-managed CKD plan, including diet and phosphorus control.",
  },

  // ── Urinary ────────────────────────────────────────────────────────────────
  {
    id: "ab-easy-peesy-ii",
    name: "Easy Peesy II (nutraceutical powder)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/easy-peesy-ii-nutraceutical-powder",
    priceUsd: 32.99,
    species: ["dog", "cat"],
    ailments: ["urinary"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [5, 6],
    summary:
      "Cranberry, D-mannose, uva ursi and a probiotic, per quarter teaspoon. It shifts urine pH, which helps one crystal type and worsens another — so the crystal type has to be known before it starts.",
  },
  {
    id: "ab-easy-peesy-protocol",
    name: "Easy Peesy Protocol (kit)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/easy-peesy-protocol",
    priceUsd: 54.99,
    species: ["dog", "cat"],
    ailments: ["urinary"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [5, 6],
    isKit: true,
    summary:
      "A 30-day kit pairing a homeopathic liquid with the Easy Peesy II powder. Graded by its parts: the powder is the half with ingredients behind it.",
  },
  {
    id: "rx-cranberry",
    name: "Rx Cranberry",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-cranberry",
    priceUsd: 30.49,
    species: ["dog", "cat"],
    ailments: ["urinary"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [5],
    summary:
      "Cranberry extract. The trials split: one small study in dogs with recurrent UTI was positive, and a randomised trial after disc surgery found no benefit. Reasonable to try, not something to rely on.",
  },
  {
    id: "checkup-urine-strips",
    name: "CheckUp Pet Urine Testing Strips (50)",
    brand: "Coastline Global",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/checkup-pet-urine-testing-strips",
    priceUsd: 19.99,
    species: ["dog", "cat"],
    ailments: ["urinary", "kidney"],
    category: "home_test",
    grade: "B",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Home urine dipsticks. Genuinely useful for catching a change early and for deciding whether a visit is urgent. Save the result to Records so your vet can see the trend — and treat a positive strip as a reason to book, not to self-treat.",
  },
  {
    id: "checkup-kit4cat",
    name: "CheckUp Kit4Cat Urine Collection Litter",
    brand: "Coastline Global",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/checkup-kit4cat-urine-collection-litter",
    priceUsd: 14.99,
    species: ["cat"],
    ailments: ["urinary"],
    category: "home_test",
    grade: "B",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Hydrophobic litter that lets urine pool so you can collect a sample at home. Makes a vet urinalysis possible without a trip just for the sample.",
  },

  // ── Heart ──────────────────────────────────────────────────────────────────
  {
    id: "biovibrant-heart-taurine",
    name: "BioVibrant HEART+ (Taurine Plus), 3.5 oz",
    brand: "inClover",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/biovibrant-taurine-plus",
    priceUsd: 25.99,
    species: ["dog", "cat"],
    ailments: ["heart"],
    category: "supplements",
    grade: "A",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "Taurine. In cats, and in dogs shown to be deficient, this is the real thing — taurine deficiency causes a heart muscle disease that can reverse when it's corrected. It supports cardiology care and never replaces heart medication.",
  },
  {
    id: "rx-formula-cv",
    name: "Rx Formula CV",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-formula-cv",
    priceUsd: 48.29,
    species: ["dog", "cat"],
    ailments: ["heart"],
    category: "supplements",
    grade: "C",
    action: "vet_only",
    safetyRuleIds: [],
    summary:
      "A cardiovascular support blend. An adjunct to a cardiologist's plan — heart disease is managed on medication and monitoring.",
  },

  // ── Brain / senior ─────────────────────────────────────────────────────────
  {
    id: "cocotherapy-mct3",
    name: "TriPlex MCT-3 Coconut Oil",
    brand: "CocoTherapy",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/cocotherapy-triplex-mct-3-oil",
    priceUsd: 27.99,
    species: ["dog"],
    ailments: ["cognition"],
    category: "supplements",
    grade: "B",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Medium-chain triglycerides, which give an ageing brain an alternative fuel. One of the better-evidenced options here for canine cognitive dysfunction. Worth ruling out pain and thyroid disease first — they look like dementia.",
  },
  {
    id: "real-mushrooms-lions-mane",
    name: "Organic Lion's Mane Mushroom Powder, 60 g",
    brand: "Real Mushrooms",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/real-mushroom-organic-lions-mane-mushroom-powder-60g",
    priceUsd: 34.99,
    species: ["dog", "cat"],
    ailments: ["cognition"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary: "Lion's mane mushroom powder. Interesting in rodent work, unstudied in dogs and cats.",
  },

  // ── Anxiety ────────────────────────────────────────────────────────────────
  {
    id: "rx-nutricalm",
    name: "Rx NutriCalm",
    brand: "Rx Vitamins",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/rx-nutricalm",
    priceUsd: 38.89,
    species: ["dog", "cat"],
    ailments: ["anxiety"],
    category: "supplements",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "A calming blend for situational stress such as fireworks or travel. Worth trying for predictable events; ongoing anxiety deserves a proper behaviour plan rather than a supplement.",
  },
  {
    id: "now-melatonin-3mg",
    name: "Melatonin 3 mg",
    brand: "NOW Foods",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/now-melatonin-3-mg",
    priceUsd: 6.99,
    species: ["dog"],
    ailments: ["anxiety", "sleep"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [10],
    summary:
      "Melatonin, used for noise fear and for dogs whose sleep cycle has drifted. A human product — check the label for xylitol, which is poisonous to dogs, and get the dose from your vet.",
  },
  {
    id: "ab-your-go-2",
    name: "Your Go 2 (first response support)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/your-go-2",
    priceUsd: 27.99,
    species: ["dog", "cat"],
    ailments: ["first_aid", "anxiety"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "A homeopathic liquid sold for shock and upset. Whatever you make of homeopathy, nothing in this category should delay a vet visit for a real injury.",
  },

  // ── Skin, itch, yeast ──────────────────────────────────────────────────────
  {
    id: "ab-yeasty-beast-spray",
    name: "Yeasty Beast Topical Spray",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/yeasty-beast-topical-spray",
    priceUsd: 29.99,
    species: ["dog"],
    ailments: ["yeast", "itch"],
    category: "grooming",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Apple cider vinegar and herbs as a topical spray. Low-cost and low-risk on intact skin — stop if the skin is broken, raw or sore, which needs a vet.",
  },
  {
    id: "ab-skin-health-spray",
    name: "Skin HEALth Spray",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/skin-health-spray",
    priceUsd: 29.99,
    species: ["dog", "cat"],
    ailments: ["wounds"],
    category: "grooming",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "A topical for minor scrapes, with no trials behind it. Fine on a surface graze; anything deep, dirty, or not healing needs to be seen.",
  },
  {
    id: "kinkind-itchy-shampoo",
    name: "Itchy Dog Shampoo (tea tree + grapefruit)",
    brand: "kin+kind",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/kin-kind-healing-clay-shampoo",
    priceUsd: 15.0,
    species: ["dog"],
    ailments: ["itch"],
    category: "grooming",
    grade: "D",
    action: "caution",
    safetyRuleIds: [4],
    summary:
      "A tea-tree and grapefruit shampoo, with no trials behind it for itch. Dogs only, and keep it away from any cat in the house — including while the coat is still damp and a cat might groom it.",
  },

  // ── Immune / cancer support ────────────────────────────────────────────────
  {
    id: "ab-turkey-tail",
    name: "Turkey Tail Mushrooms (liquid extract)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/turkey-tail-mushrooms",
    priceUsd: 32.99,
    species: ["dog", "cat"],
    ailments: ["cancer_support", "immune"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [9],
    summary:
      "Turkey tail mushroom extract, the source of the PSP fraction. An add-on alongside oncology care only — the randomised trial is the reason for the caveat.",
  },
  {
    id: "real-mushrooms-turkey-tail-caps",
    name: "Organic Turkey Tail Capsules, 90 count",
    brand: "Real Mushrooms",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/real-mushrooms-organic-turkey-tail-capsules-90-count",
    priceUsd: 29.99,
    species: ["dog", "cat"],
    ailments: ["cancer_support", "immune"],
    category: "supplements",
    grade: "C",
    action: "caution",
    safetyRuleIds: [9],
    summary:
      "Turkey tail in capsule form. Same position: alongside oncology care, never instead of it.",
  },
  {
    id: "ab-chaga",
    name: "Chaga Mushrooms (liquid extract)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/chaga-mushrooms-liquid-extract",
    priceUsd: 59.99,
    species: ["dog", "cat"],
    ailments: ["immune"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "Chaga mushroom extract. No pet trials, and chaga is high in oxalate — which matters for any pet with a history of oxalate bladder stones.",
  },
  {
    id: "ab-pawsitive-immunity",
    name: "Pawsitive Immunity (colostrum alternative)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/pawsitive-immunity",
    priceUsd: 39.99,
    species: ["dog", "cat"],
    ailments: ["immune", "allergy"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "Bovine plasma immunoglobulins, sold as an alternative to colostrum. Plausible mechanism, no pet trials we could find.",
  },
  {
    id: "ab-vital-defense",
    name: "Vital Defense (cellular support)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/vital-defense-cellular-support",
    priceUsd: 119.99,
    species: ["dog", "cat"],
    ailments: ["longevity"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "A blend aimed at cellular ageing. No defined outcome to measure and no trials — at this price, that's worth saying plainly.",
  },
  {
    id: "ab-phyto-synergy",
    name: "Phyto Synergy (marine phytoplankton)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/phyto-synergy",
    priceUsd: 61.99,
    species: ["dog", "cat"],
    ailments: ["wellness"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary: "Marine phytoplankton, sold as an antioxidant. Traditional use, no pet studies behind it.",
  },
  {
    id: "ab-rebalancer",
    name: "Rebalancer",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/rebalancer",
    priceUsd: 27.99,
    species: ["dog", "cat"],
    ailments: ["vaccinosis"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [],
    summary:
      "A homeopathic sold for “vaccinosis”. Listed because it opens several of the kits — not as evidence that vaccines cause the harms that term implies. They are not shown to.",
  },

  // ── Dental ─────────────────────────────────────────────────────────────────
  {
    id: "drjudy-dental-formula",
    name: "Dental Health Formula",
    brand: "Dr. Judy Morgan's Naturally Healthy Pets",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/dr-morgans-dental-drops",
    priceUsd: 39.99,
    species: ["dog", "cat"],
    ailments: ["dental"],
    category: "dental",
    grade: "C",
    action: "caution",
    safetyRuleIds: [4],
    summary:
      "Dental drops containing peppermint and cinnamon oils — which is a problem for cats specifically. No VOHC seal; brushing and a vet dental are still what shift tartar.",
  },

  // ── Fleas and ticks ────────────────────────────────────────────────────────
  {
    id: "drjudy-flea-comb",
    name: "Flea Comb for Dogs and Cats",
    brand: "Dr. Judy Morgan's Naturally Healthy Pets",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/flea-comb-for-dogs-and-cats",
    priceUsd: 5.99,
    species: ["dog", "cat"],
    ailments: ["fleas"],
    category: "parasite",
    grade: "B",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "A flea comb. Unglamorous and genuinely effective — it confirms whether there are fleas at all, and it's the safe option for animals too young or too small for anything else.",
  },
  {
    id: "flea-destroyer-nematodes",
    name: "Flea Destroyer (beneficial nematodes)",
    brand: "Flea Destroyer",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/flea-destroyer-beneficial-nematodes",
    priceUsd: 59.99,
    species: "environment",
    ailments: ["fleas"],
    category: "parasite",
    grade: "C",
    action: "recommend",
    safetyRuleIds: [],
    summary:
      "Microscopic worms applied to the yard, where they feed on flea larvae in soil. A reasonable part of breaking the outdoor half of the flea cycle. It goes on the ground, not on the pet.",
  },
  {
    id: "fleasgone-tag",
    name: "FleasGone Tag",
    brand: "FleasGone",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/fleasgone-tag-non-toxic-flea-and-tick-prevention",
    priceUsd: 79.99,
    species: ["dog", "cat"],
    ailments: ["fleas", "ticks"],
    category: "parasite",
    grade: "D",
    action: "avoid",
    safetyRuleIds: [],
    summary:
      "Petwell doesn't recommend this. There's no evidence a tag repels fleas or ticks, and in an area with ticks or heartworm, a preventive that doesn't work is a genuine risk rather than a neutral one.",
  },

  // ── Not recommended ────────────────────────────────────────────────────────
  {
    id: "ab-colloidal-silversol",
    name: "Colloidal SilverSol",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/colloidal-silversol",
    priceUsd: 24.99,
    species: ["dog", "cat"],
    ailments: ["infection"],
    category: "supplements",
    grade: "D",
    action: "avoid",
    safetyRuleIds: [3],
    summary:
      "Petwell doesn't recommend colloidal silver. There is no good evidence of any benefit against infection, and prolonged use can permanently discolour skin. An infection needs a vet.",
  },
  {
    id: "vdi-allergy-panel",
    name: "Allergy Panel Test Kit",
    brand: "VDI Laboratory",
    store: "drjudymorgan.com",
    url: "https://drjudymorgan.com/products/allergy-panel-test-kit",
    priceUsd: 240.0,
    species: ["dog", "cat"],
    ailments: ["allergy"],
    category: "home_test",
    grade: "D",
    action: "avoid",
    safetyRuleIds: [],
    summary:
      "Petwell doesn't recommend hair or saliva allergy tests. They have not been shown to tell allergic animals from healthy ones. For food allergy the answer is a vet-supervised elimination diet; for environmental allergy it's intradermal or serum IgE testing through a vet.",
  },

  // ── Kits ───────────────────────────────────────────────────────────────────
  {
    id: "ab-leaky-gut-protocol",
    name: "Leaky Gut Protocol (kit)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/leaky-gut-protocol",
    priceUsd: 139.99,
    species: ["dog"],
    ailments: ["chronic_gi", "allergy"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [1, 2, 7],
    isKit: true,
    summary:
      "A four-product course run over several weeks. Petwell grades the pieces rather than the bundle: the probiotic and glutamine parts are reasonable, the homeopathics aren't, and “leaky gut” isn't something a vet can confirm. Chronic diarrhoea needs a workup first.",
  },
  {
    id: "ab-yeasty-beast-protocol",
    name: "Yeasty Beast Protocol (3-product kit)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/yeasty-beast-protocol-3-product-kit",
    priceUsd: 79.99,
    species: ["dog"],
    ailments: ["yeast", "itch"],
    category: "supplements",
    grade: "D",
    action: "info_only",
    safetyRuleIds: [1, 2],
    isKit: true,
    summary:
      "A staged kit run over roughly 60 days. The “die-off” idea it's sold on has no evidence behind it, and itch has many causes — fleas, atopy, food — worth ruling out before a two-month course.",
  },
  {
    id: "ab-canine-allergy-bundle",
    name: "Canine Allergy Bundle (kit)",
    brand: "Adored Beast Apothecary",
    store: "adoredbeast.com",
    url: "https://adoredbeast.com/products/canine-allergy-bundle",
    priceUsd: 132.99,
    species: ["dog"],
    ailments: ["allergy"],
    category: "supplements",
    grade: "C",
    action: "info_only",
    safetyRuleIds: [1, 2],
    isKit: true,
    summary:
      "Liver Tonic, Phyto Synergy and a probiotic sold together for itch. Omega-3 and PEA have better evidence for itch than anything in this bundle, at lower cost.",
  },
];

/**
 * What's inside each kit, in the order the seller runs them.
 *
 * The research doc is explicit: show the components, grade each separately, and
 * never present a single grade for the bundle. A kit's own `grade` field above is
 * only ever used to sort it below the individually-graded options.
 */
export interface KitComponent {
  /** Catalogue id when the component is sold separately, else null. */
  productId: string | null;
  name: string;
  /** What this piece is, in Petwell's words. */
  what: string;
  grade: EvidenceGrade;
  step?: string;
}

export const KITS: Record<string, { components: KitComponent[]; note: string }> = {
  "ab-leaky-gut-protocol": {
    note: "Run over several weeks, each bottle until empty, dosed by weight.",
    components: [
      { productId: "ab-rebalancer", name: "Rebalancer", what: "Homeopathic liquid.", grade: "D", step: "2-day pre-step" },
      { productId: "ab-liver-tonic", name: "Liver Tonic", what: "Herbal tincture containing greater celandine and barberry.", grade: "D", step: "then, together" },
      { productId: "ab-healthy-gut", name: "Healthy Gut", what: "Probiotic plus digestive enzymes.", grade: "C", step: "then, together" },
      { productId: "ab-canine-gut-soothe", name: "Gut Soothe", what: "Probiotic with slippery elm, L-glutamine and DGL.", grade: "C", step: "then, together" },
      { productId: null, name: "Gut Seal", what: "Homeopathic liquid.", grade: "D", step: "then, together" },
    ],
  },
  "ab-yeasty-beast-protocol": {
    note: "Staged over roughly 60 days for dogs up to 60 lb.",
    components: [
      { productId: "ab-liver-tonic", name: "Liver Tonic", what: "Herbal tincture containing greater celandine and barberry.", grade: "D", step: "days 1–3" },
      { productId: null, name: "Yeasty Beast I", what: "Homeopathic liquid.", grade: "D", step: "from day 4" },
      { productId: null, name: "Yeasty Beast II", what: "Enzymes and herbs.", grade: "D", step: "from day 7" },
    ],
  },
  "ab-canine-allergy-bundle": {
    note: "All three given daily, dosed by weight.",
    components: [
      { productId: "ab-liver-tonic", name: "Liver Tonic", what: "Herbal tincture, twice daily in this bundle.", grade: "D" },
      { productId: "ab-phyto-synergy", name: "Phyto Synergy", what: "Marine phytoplankton.", grade: "D" },
      { productId: "ab-fidos-flora", name: "Fido's Flora", what: "Canine-derived probiotic.", grade: "C" },
    ],
  },
  "ab-easy-peesy-protocol": {
    note: "30-day course, then a 14-day maintenance round up to four times a year.",
    components: [
      { productId: null, name: "Easy Peesy I", what: "Homeopathic liquid, 4 pumps twice daily.", grade: "D" },
      { productId: "ab-easy-peesy-ii", name: "Easy Peesy II", what: "Cranberry, D-mannose, uva ursi and a probiotic.", grade: "C" },
    ],
  },
};

export const PRODUCTS_BY_ID = new Map(GRADED_PRODUCTS.map((p) => [p.id, p]));

/** Products tagged for an ailment, strongest evidence first. */
export function productsForAilment(ailment: Ailment): GradedProduct[] {
  const order: Record<EvidenceGrade, number> = { A: 0, B: 1, C: 2, D: 3 };
  return GRADED_PRODUCTS.filter((p) => p.ailments.includes(ailment)).sort(
    (a, b) => order[a.grade] - order[b.grade] || a.priceUsd - b.priceUsd,
  );
}
