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

// ── 2. pet-food filter ───────────────────────────────────────
ck("2 pet term -> included", isPetFoodRecall(rawRecall) === true);
ck("2 cat food included", isPetFoodRecall({ product_description: "Whisker Cat Food pate" }) === true);
ck("2 human-only excluded", isPetFoodRecall({ product_description: "Infant formula, milk-based" }) === false);
ck("2 generic human food excluded", isPetFoodRecall({ product_description: "Romaine lettuce, bagged salad" }) === false);

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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
