/**
 * Real-data foundation tests (pure functions). Run from expo/:
 *   bun tests/data.test.ts
 *
 * Covers: openFDA recall normalization + dedup + pet-food filter, product-match
 * confidence ranking, provenance/lab-evidence labelling (product > brand, no-lab
 * stays low, demo never "verified", stale is labelled), recall brand-level ≠
 * exact product recall, no purity overclaim, triage red-flag suppression, and
 * the toxic-ingredient safety gate.
 *
 * Also covers the commercial-readiness additions: per-pet recall alert matching,
 * breed→nutrition context matching, FTC affiliate-disclosure screen coverage, and
 * product matching against a catalog larger than the client-side cap.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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
import { BREED_FIT_GUIDANCE_LABEL, findBreedFit, normalizeBreed, type BreedFitRow } from "../lib/food/breedFit";
import { matchByText, type CatalogItem } from "../lib/food/match";
import { matchRecallsToPets, type FedLogForMatching, type RecallForMatching } from "../lib/food/recallNotify";
import { buildPlan } from "../lib/integrative/engine";
import { checkItemSafety } from "../lib/integrative/safety";
import { catalogById } from "../lib/integrative/catalog";
import { AFFILIATE_DISCLOSURE } from "../lib/integrative/marketplace";

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
ck("2 'cat fish' (spaced seafood) excluded", petRecall("Cat Fish fillets, frozen, farm-raised", { product_type: "Food" }) === false);
ck("2 'catfish' one-word seafood excluded", petRecall("Catfish nuggets, breaded, food", { product_type: "Food" }) === false);
ck("2 'chili dog' excluded", petRecall("Chili Dog sauce, canned", { product_type: "Food" }) === false);

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

// ── 12. per-pet recall alerts: one per (pet, recall), opens the FDA notice ───
const EXPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url).href), "..");
const src = (rel: string): string => readFileSync(join(EXPO_ROOT, rel), "utf8");

const recallSunny: RecallForMatching = {
  id: "recall-1",
  brandId: "brand-sunny",
  brandName: "Sunny Fields",
  reason: "Elevated vitamin D in finished product",
  sourceUrl: "https://www.fda.gov/safety/recalls/sunny-fields-2026",
  recallDate: "2026-08-14",
};
const productBrands = new Map<string, string | null>([
  ["prod-sunny-chicken", "brand-sunny"],
  ["prod-sunny-beef", "brand-sunny"],
  ["prod-other", "brand-other"],
]);

// The same pet fed the recalled brand four times (two products, two repeats).
const repeatLogs: FedLogForMatching[] = [
  { petId: "pet-1", productId: "prod-sunny-chicken", label: "Sunny Fields Chicken Recipe" },
  { petId: "pet-1", productId: "prod-sunny-chicken", label: "Sunny Fields Chicken Recipe" },
  { petId: "pet-1", productId: "prod-sunny-beef", label: "Sunny Fields Beef Recipe" },
  { petId: "pet-1", productId: "prod-other", label: "Something else" },
];
const oneAlert = matchRecallsToPets([recallSunny], repeatLogs, productBrands);
ck("12 a matched recall raises exactly ONE alert per pet (not per log)", oneAlert.length === 1 && oneAlert[0]?.petId === "pet-1");
ck("12 the alert carries the recall's FDA source link", oneAlert[0]?.url === recallSunny.sourceUrl);
ck("12 the alert carries the brand + reason for honest copy", oneAlert[0]?.brandName === "Sunny Fields" && /vitamin d/i.test(oneAlert[0]?.reason ?? ""));

// Two pets on the same recalled brand → one alert each.
const twoPets = matchRecallsToPets([recallSunny], [
  { petId: "pet-1", productId: "prod-sunny-chicken", label: "" },
  { petId: "pet-2", productId: "prod-sunny-beef", label: "" },
], productBrands);
ck("12 two pets fed the brand get one alert each", twoPets.length === 2 && new Set(twoPets.map((a) => a.petId)).size === 2);

// Free-text log (no catalog product) still matches on the brand name.
const labelOnly = matchRecallsToPets([recallSunny], [{ petId: "pet-3", productId: null, label: "half cup sunny fields chicken" }], productBrands);
ck("12 free-text label mentioning the brand matches", labelOnly.length === 1 && labelOnly[0]?.petId === "pet-3");

// Unrelated food → nothing. Silence matters more than coverage here.
const noMatch = matchRecallsToPets([recallSunny], [{ petId: "pet-4", productId: "prod-other", label: "Meadow Kitchen Turkey" }], productBrands);
ck("12 an unmatched brand raises no alert", noMatch.length === 0);

// Short brand names are never label-matched (would fire on any substring).
const shortBrand = matchRecallsToPets(
  [{ ...recallSunny, brandId: null, brandName: "Fit" }],
  [{ petId: "pet-5", productId: null, label: "Fitness Formula Adult" }],
  productBrands,
);
ck("12 brand names <4 chars never fuzzy-match a free-text label", shortBrand.length === 0);

// A recall with no source URL still opens the FDA recalls page.
const noUrl = matchRecallsToPets([{ ...recallSunny, sourceUrl: null }], [{ petId: "pet-1", productId: "prod-sunny-chicken", label: "" }], productBrands);
ck("12 a recall without a source URL falls back to the FDA recalls page", /fda\.gov\/animal-veterinary\/safety-health\/recalls-withdrawals/.test(noUrl[0]?.url ?? ""));

// Service wiring: throttled, permission-respecting, and the notification opens the link.
const alertSrc = src("services/recallAlertService.ts");
ck("12 alerts only run against the real backend (never demo/local data)", /getMode\(\) === "remote"/.test(alertSrc) && /isSupabaseConfigured/.test(alertSrc));
ck("12 alerts never prompt for permission, only use an existing grant", /getPermissionsAsync/.test(alertSrc) && !/requestPermissionsAsync/.test(alertSrc));
ck("12 alerts are throttled and capped per run", /LAST_RUN_KEY/.test(alertSrc) && /MAX_NOTIFICATIONS_PER_RUN/.test(alertSrc));
ck("12 only verified official recalls trigger alerts", /"verified_official"/.test(alertSrc));
ck("12 notification copy stays brand-level ('may affect', not 'was recalled')", /may affect \$\{pet\}/.test(alertSrc) && /brand-level match/.test(alertSrc));
ck("12 notification carries the FDA url in its data payload", /data: \{ url: alert\.url \}/.test(alertSrc));
const notifSrc = src("services/notificationsService.ts");
ck("12 tapping a notification opens its https link", /addNotificationResponseReceivedListener/.test(notifSrc) && /Linking\.openURL/.test(notifSrc) && /\^https:/.test(notifSrc));
ck("12 the link handler is registered at app root", /initNotificationLinkHandler\(\)/.test(src("app/_layout.tsx")));

// ── 13. breed → nutrition context (general guidance, never a diagnosis) ──────
const fitRow = (breed: string, species: "dog" | "cat"): BreedFitRow => ({
  breed,
  species,
  sizeClass: null,
  nutritionConsiderations: "General considerations",
  nutrientsToDiscuss: "Discuss with your vet",
  avoidMonitorNotes: null,
  preferredFoodTraits: null,
  cautionFlags: null,
  sourceUrl: null,
  notes: null,
});
const breedRows: BreedFitRow[] = [
  fitRow("Labrador Retriever", "dog"),
  fitRow("Retriever", "dog"),
  fitRow("Poodle (Standard/Miniature/Toy)", "dog"),
  fitRow("Maine Coon", "cat"),
];
ck("13 normalize strips mix words", normalizeBreed("Labrador Retriever Mix") === "labrador retriever");
ck("13 normalize strips parentheticals", normalizeBreed("Domestic Shorthair (cat)") === "domestic shorthair");
ck("13 mixes resolve to the base breed", findBreedFit(breedRows, "Labrador Retriever Mix", "dog")?.breed === "Labrador Retriever");
ck("13 the most specific row wins over a shorter containment", findBreedFit(breedRows, "labrador retriever", "dog")?.breed === "Labrador Retriever");
ck("13 a qualified row matches the plain breed name", findBreedFit(breedRows, "Poodle", "dog")?.breed === "Poodle (Standard/Miniature/Toy)");
ck("13 species is respected (a cat breed never matches a dog)", findBreedFit(breedRows, "Maine Coon", "dog") === null);
ck("13 unknown breeds return nothing rather than a guess", findBreedFit(breedRows, "Shiba Inu", "dog") === null);
ck("13 too-short input returns nothing", findBreedFit(breedRows, "Ox", "dog") === null);
ck("13 guidance label says general + not individually vet-reviewed", /general guidance/i.test(BREED_FIT_GUIDANCE_LABEL) && /not individually vet-reviewed/i.test(BREED_FIT_GUIDANCE_LABEL));
ck("13 guidance label defers to body condition/life stage/vet, never breed alone", /never breed alone/i.test(BREED_FIT_GUIDANCE_LABEL));
const breedMigration = src("../supabase/migrations/0034_breed_food_fit.sql");
ck("13 breed_food_fit is RLS-enabled, world-read, admin-write", /enable row level security/i.test(breedMigration) && /private\.is_admin\(\)/.test(breedMigration));
ck("13 breed_food_fit is unique per (breed, species)", /unique\s*\(\s*breed\s*,\s*species\s*\)/i.test(breedMigration));
const breedScreens = ["app/add-pet.tsx", "app/food-result.tsx"];
for (const screen of breedScreens) {
  const s = src(screen);
  ck(`13 ${screen} shows the guidance label with breed context`, /BREED_FIT_GUIDANCE_LABEL/.test(s) && /breedFit/i.test(s));
}

// ── 14. FTC: every screen that can surface an affiliate link discloses it ────
function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...tsxFiles(full));
    else if (entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}
const screenFiles = tsxFiles(join(EXPO_ROOT, "app"));
const affiliateScreens = screenFiles.filter((f) => /affiliateUrl|retailerFallbackUrl/.test(readFileSync(f, "utf8")));
ck("14 the affiliate-link scan found screens to check", affiliateScreens.length >= 2, `${affiliateScreens.length} found`);
const undisclosed = affiliateScreens.filter((f) => !/<AffiliateDisclosure\s*\/>/.test(readFileSync(f, "utf8")));
ck(
  "14 every screen rendering an affiliate/retailer link renders the disclosure",
  undisclosed.length === 0,
  undisclosed.map((f) => f.slice(EXPO_ROOT.length)).join(", "),
);
ck("14 disclosure names affiliate links, the commission, and no extra cost", /affiliate links/i.test(AFFILIATE_DISCLOSURE) && /commission/i.test(AFFILIATE_DISCLOSURE) && /no extra cost/i.test(AFFILIATE_DISCLOSURE));
ck("14 disclosure states rankings are never influenced by commissions", /never influenced by commissions/i.test(AFFILIATE_DISCLOSURE));
ck("14 the disclosure component is the single source of that copy", /AFFILIATE_DISCLOSURE/.test(src("components/AffiliateDisclosure.tsx")));
ck("14 marketplace link chain is affiliate → product → retailer fallback", /affiliateUrl \?\? r\.product\.productUrl \?\? r\.product\.retailerFallbackUrl/.test(src("app/marketplace.tsx")));
ck("14 food result link chain is brand affiliate → retailer fallback", /brand\?\.affiliateUrl \?\? bundle\.brand\?\.retailerFallbackUrl/.test(src("app/food-result.tsx")));
ck("14 outbound links are labelled as affiliate links in the UI", /affiliate link/i.test(src("app/marketplace.tsx")) && /affiliate link/i.test(src("app/food-result.tsx")));

// ── 15. product match works past the client-side catalog cap ─────────────────
// The scan path narrows candidates server-side (RPC); the in-JS matcher must
// still pick the right product when handed more rows than the defensive cap.
const CAP = 2000;
const bigCatalog: CatalogItem[] = Array.from({ length: CAP + 600 }, (_, i) => ({
  id: `filler-${i}`,
  name: `Filler Recipe ${i}`,
  brand: "Filler Brand",
  barcode: null,
  species: "dog" as const,
  productType: "dry",
  ingredientNames: ["corn", "soybean meal", "animal fat"],
}));
// Put the true match last — a cap-truncated list would never see it.
bigCatalog.push({
  id: "needle",
  name: "Harbor Point Salmon & Sweet Potato",
  brand: "Harbor Point",
  barcode: "0123456789012",
  species: "dog",
  productType: "dry",
  ingredientNames: ["salmon", "sweet potato", "peas", "salmon oil"],
});
const bigMatch = matchByText(
  { ingredients: ["salmon", "sweet potato", "peas", "salmon oil"], guaranteed: {}, raw: "" },
  bigCatalog,
  { nameHint: "Harbor Point Salmon", canonicalNames: ["salmon", "sweet potato", "peas", "salmon oil", "corn"], aliasMap: {} },
);
ck("15 the right product is found in a catalog larger than the cap", bigMatch.best?.id === "needle", `got ${bigMatch.best?.id ?? "null"}`);
ck("15 confidence is high for a full ingredient + name match", bigMatch.score > 0.6);
ck("15 suggestions stay a short ranked list", bigMatch.suggestions.length <= 5 && bigMatch.suggestions[0]?.id === "needle");
const foodServiceSrc = src("services/foodService.ts");
ck("15 both scan paths use the server-side RPC narrowing, not the whole catalog", (foodServiceSrc.match(/getMatchCandidates\(/g) ?? []).length >= 3);
ck("15 the RPC is called with a candidate ceiling and demo awareness", /supabase\.rpc\("match_food_products"/.test(foodServiceSrc) && /max_candidates/.test(foodServiceSrc) && /include_demo/.test(foodServiceSrc));
ck("15 the client catalog remains only a fallback", /getCatalogItems\(\{ species: opts\.species, limit: opts\.limit \}\)/.test(foodServiceSrc));
const matchRpc = src("../supabase/migrations/0020_food_match_rpc.sql");
ck("15 the RPC exists and is index-backed (trigram name search)", /match_food_products/.test(matchRpc) && /gin_trgm_ops/.test(matchRpc));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
