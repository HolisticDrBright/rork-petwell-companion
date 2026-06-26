/**
 * Real-data foundation tests (pure functions). Run from expo/:
 *   bun tests/data.test.ts
 *
 * Covers: openFDA recall normalization + dedup + pet-food filter, product-match
 * confidence ranking, provenance/lab-evidence labelling (product > brand, no-lab
 * stays low, demo never "verified", stale is labelled), recall brand-level ≠
 * exact product recall, no purity overclaim, triage red-flag suppression, and
 * the toxic-ingredient safety gate.
 */
import {
  isPetFoodRecall,
  normalizePetFoodRecalls,
  normalizeRecall,
  recallDedupKey,
  severityFromClassification,
  type OpenFdaRecall,
} from "../lib/food/recallNormalize";
import {
  countsAsProductLevelPurity,
  EVIDENCE_COPY,
  EVIDENCE_STATUS_BADGE,
  evidenceBasis,
  evidenceLevelRank,
  isStale,
  labEvidence,
  recallBadge,
} from "../lib/food/provenance";
import { classifyMatch, matchRank } from "../lib/food/productMatch";
import { buildPlan } from "../lib/integrative/engine";
import { checkItemSafety } from "../lib/integrative/safety";
import { catalogById } from "../lib/integrative/catalog";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. openFDA normalization ─────────────────────────────────
const rawRecall: OpenFdaRecall = {
  recall_number: "F-1234-2026",
  event_id: "90001",
  status: "Ongoing",
  classification: "Class I",
  product_description: "Acme Dog Food, Chicken Recipe, 5 lb bag",
  reason_for_recall: "Potential Salmonella contamination",
  recall_initiation_date: "20260115",
  recalling_firm: "Acme Pet Foods Inc",
  distribution_pattern: "Nationwide",
  product_type: "Food",
};
const norm = normalizeRecall(rawRecall);
ck("1 date YYYYMMDD -> ISO", norm.recallDate === "2026-01-15");
ck("1 maps brand/product/reason", norm.brandName === "Acme Pet Foods Inc" && /Acme Dog Food/.test(norm.productName) && /Salmonella/.test(norm.reason));
ck("1 Class I -> severity bad", norm.severity === "bad" && severityFromClassification("Class III") === "watch");
ck("1 dedup key uses recall number", recallDedupKey(rawRecall) === "rn:F-1234-2026");

// ── 2. pet-food filter (conservative: excludes human-food false positives) ───
const petRecall = (product_description: string, extra: Partial<OpenFdaRecall> = {}) =>
  isPetFoodRecall({ product_description, ...extra });

// True pet-food recalls — INCLUDED
ck("2 true dog food included", isPetFoodRecall(rawRecall) === true);
ck("2 true cat food included", petRecall("Whisker Cat Food pate") === true);
ck("2 pet treats included", petRecall("Premium Pet Treats, peanut butter") === true);
ck("2 dog treats included", petRecall("Chicken jerky dog treats") === true);
ck("2 kibble included", petRecall("Grain-free puppy kibble, 12 lb") === true);
ck("2 animal feed for dogs included", petRecall("Animal feed for dogs and cats, medicated") === true);

// Human-food FALSE POSITIVES (contain dog/animal/puppy) — EXCLUDED
ck("2 'hot dog buns' excluded", petRecall("Brand X Hot Dog Buns, 8 ct", { product_type: "Food" }) === false);
ck("2 'animal crackers' excluded", petRecall("Frosted Animal Crackers, 1 lb", { product_type: "Food" }) === false);
ck("2 'fresh mango' excluded", petRecall("Fresh Mango Chunks, refrigerated", { product_type: "Food" }) === false);
ck("2 'corn dog' excluded", petRecall("Beef Corn Dogs, frozen", { product_type: "Food" }) === false);
ck("2 'hush puppies' excluded", petRecall("Hush Puppies, cornmeal, frozen", { product_type: "Food" }) === false);

// Other human / livestock — EXCLUDED
ck("2 human-only (infant formula) excluded", petRecall("Infant formula, milk-based") === false);
ck("2 generic produce excluded", petRecall("Romaine lettuce, bagged salad") === false);
ck("2 livestock animal feed excluded (no companion hint)", petRecall("Cattle animal feed, 50 lb", { product_type: "Food" }) === false);

// ── 3. dedup across a batch ──────────────────────────────────
const batch: OpenFdaRecall[] = [
  rawRecall,
  { ...rawRecall }, // exact dup (same recall number)
  { ...rawRecall, recall_number: "F-9999-2026", product_description: "Acme Cat Food, Salmon" },
  { product_description: "Bagged human spinach", reason_for_recall: "Listeria", recall_initiation_date: "20260201" }, // not pet
];
const deduped = normalizePetFoodRecalls(batch);
ck("3 dedups + filters", deduped.length === 2, `got ${deduped.length}`);

// ── 4. product-match confidence ──────────────────────────────
ck("4 exact barcode classified", classifyMatch({ exactBarcode: true }) === "exact_barcode");
ck("4 admin overrides all", classifyMatch({ exactBarcode: true, adminConfirmed: true }) === "admin_confirmed");
ck("4 strong needs name+ingredients", classifyMatch({ nameScore: 0.8, ingredientOverlap: 0.7 }) === "strong");
ck("4 low signals -> weak", classifyMatch({ nameScore: 0.3, ingredientOverlap: 0.1 }) === "weak");
ck("4 exact outranks weak; admin outranks all", matchRank("exact_barcode") > matchRank("weak") && matchRank("admin_confirmed") >= matchRank("exact_barcode"));

// ── 5. lab evidence labelling ────────────────────────────────
const noLab = labEvidence({ hasEvidence: false, demoOnly: false, stale: false, flagged: false, realProductTests: 0 });
ck("5 no lab -> none + 'No public lab test found'", noLab.confidence === "none" && /no public lab test found/i.test(noLab.text));
const demo = labEvidence({ hasEvidence: true, level: "product", demoOnly: true, stale: false, flagged: false, realProductTests: 0 });
ck("5 demo -> low, never 'Product-level lab', says demo", demo.confidence === "low" && demo.badge.label !== "Product-level lab" && /demo/i.test(demo.text) && !/verified product-level/i.test(demo.text));
const stale = labEvidence({ hasEvidence: true, level: "product", demoOnly: false, stale: true, flagged: false, realProductTests: 1 });
ck("5 stale -> labelled stale/expired", /stale|expired/i.test(stale.badge.label));
const prod = labEvidence({ hasEvidence: true, level: "product", demoOnly: false, stale: false, flagged: false, realProductTests: 2 });
ck("5 product-level verified -> high + product-level label", prod.confidence === "high" && prod.badge.label === "Product-level lab" && /verified product-level/i.test(prod.text));
const brand = labEvidence({ hasEvidence: true, level: "brand", demoOnly: false, stale: false, flagged: false, realProductTests: 0 });
ck("5 brand-level never shown as product-level", brand.badge.label === "Brand-level only" && brand.confidence === "low");
ck("5 product-level outranks brand-level (rank)", evidenceLevelRank("product") > evidenceLevelRank("brand"));
ck("5 stale freshness check", isStale("2024-01-01", "2026-06-25T00:00:00Z") === true && isStale("2027-01-01", "2026-06-25T00:00:00Z") === false);

// ── 6. recall brand-level match != exact product recall ──────
ck("6 product recall badge", recallBadge("product").label === "Official FDA Recall");
ck("6 brand match is distinct, not an exact product recall", recallBadge("brand").label === "Brand-level recall match");

// ── 7. no purity overclaim in any provenance text ────────────
const texts = [noLab.text, demo.text, stale.text, prod.text, brand.text, noLab.badge.label, demo.badge.label];
const banned = [/\bcleanest\b/i, /guaranteed (pure|safe|clean)/i, /photo (detects|can detect|verifies|confirms)/i];
let overclaim = 0;
for (const t of texts) for (const re of banned) if (re.test(t)) { console.log(`  OVERCLAIM: "${t}"`); overclaim++; }
ck("7 no purity overclaim in provenance copy", overclaim === 0);

// ── 8. triage red flags suppress natural recommendations ─────
const pet = { name: "Buddy", species: "dog" as const, ageYears: 5, conditions: [], allergies: [] };
const emergencyPlan = buildPlan({ system: "gut", urgency: "red", redFlags: ["Repeated vomiting", "Collapse"], pet });
const hasNatural = emergencyPlan.recommendations.some((r) => r.type === "supplement" || r.type === "herb");
ck("8 red urgency sets emergencyOverride", emergencyPlan.emergencyOverride === true);
ck("8 red urgency suppresses supplements/herbs", hasNatural === false);

// ── 9. toxic-ingredient safety gate (cats stricter) ──────────
const turmericCat = checkItemSafety(catalogById("turmeric")!, { name: "Luna", species: "cat", ageYears: 6, conditions: [], allergies: [] });
ck("9 turmeric blocked for cats", turmericCat.allowed === false);

// ── 10. conservative evidence copy + basis (real dataset integration) ─────────
// A public study is real evidence but NOT product-specific.
const study = labEvidence({ hasEvidence: true, level: "study", demoOnly: false, stale: false, flagged: false, realProductTests: 0 });
ck("10 public study -> low confidence, not product-level", study.confidence === "low" && study.badge.label !== "Product-level lab" && /not specific to this product/i.test(study.text));

// Dated no-COA copy reflects the research finding (zero product-level COAs).
ck("10 no-product-COA copy is dated + says product-level", /no public product-level coa found as of \d{4}-\d{2}-\d{2}\./i.test(EVIDENCE_COPY.noProductCoa("2026-06-26")));
ck("10 brand-claim copy says not independent lab verification", /not independent lab verification/i.test(EVIDENCE_COPY.brandClaimOnly));
ck("10 open-database copy says pending review", /pending review/i.test(EVIDENCE_COPY.openDatabasePending));

// evidenceBasis: study > brand > open; null when only demo sources.
ck("10 basis prefers public study", evidenceBasis([{ sourceType: "study", isDemo: false }, { sourceType: "brand", isDemo: false }])?.text === EVIDENCE_COPY.publicStudy);
ck("10 basis brand claim is not lab verified", evidenceBasis([{ sourceType: "brand", isDemo: false }])?.text === EVIDENCE_COPY.brandClaimOnly);
ck("10 basis open database pends review", evidenceBasis([{ sourceType: "open_pet_food_facts", isDemo: false }])?.text === EVIDENCE_COPY.openDatabasePending);
ck("10 demo-only sources yield no basis (never shown as evidence)", evidenceBasis([{ sourceType: "lab", isDemo: true }]) === null);

// No overclaim words anywhere in the mandated copy or status-badge labels.
const allCopy = [
  ...Object.values(EVIDENCE_COPY).map((v) => (typeof v === "function" ? v("2026-06-26") : v)),
  ...Object.values(EVIDENCE_STATUS_BADGE).map((b) => b.label),
  study.text,
];
const bannedWords = [/\bcleanest\b/i, /\bsafest\b/i, /\bverified clean\b/i, /\bpure\b/i, /guaranteed (pure|safe|clean)/i];
let copyOverclaim = 0;
for (const t of allCopy) for (const re of bannedWords) if (re.test(t)) { console.log(`  OVERCLAIM: "${t}"`); copyOverclaim++; }
ck("10 no cleanest/safest/pure/verified-clean in evidence copy or badges", copyOverclaim === 0);

// ── 11. product-level purity gate (lab_tests wiring) ─────────────────────────
// Only an independent, current, product-level passing test may raise purity.
ck("11 product + verified_lab + pass counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "product", evidenceStatus: "verified_lab" }) === true);
ck("11 legacy product seed (null status) counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "product", evidenceStatus: null }) === true);
ck("11 brand-level never counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "brand", evidenceStatus: "verified_lab" }) === false);
ck("11 study-level never counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "study", evidenceStatus: "verified_lab" }) === false);
ck("11 product + brand_claim (unverified) never counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "product", evidenceStatus: "brand_claim" }) === false);
ck("11 product + open_database never counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "product", evidenceStatus: "open_database" }) === false);
ck("11 stale product evidence never counts", countsAsProductLevelPurity({ isDemo: false, status: "pass", level: "product", evidenceStatus: "stale" }) === false);
ck("11 demo never counts", countsAsProductLevelPurity({ isDemo: true, status: "pass", level: "product", evidenceStatus: "verified_lab" }) === false);
ck("11 non-pass (elevated) never counts", countsAsProductLevelPurity({ isDemo: false, status: "elevated", level: "product", evidenceStatus: "verified_lab" }) === false);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
