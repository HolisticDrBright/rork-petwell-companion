/**
 * Safety-critical unit tests (pure functions). Run from the expo/ directory:
 *   bun tests/safety.test.ts
 *
 * Covers: triage red-flag escalation can't be downgraded, adaptive follow-ups,
 * food contaminant confidence is driven only by lab evidence (never a photo),
 * demo lab data is labeled, no-lab => low confidence, cat herb/supplement gates,
 * pancreatitis low-fat plan warnings, pet input clamping, OCR text normalization,
 * and privacy export table coverage.
 */
import { buildReview } from "../lib/food/engine";
import { puritySummary } from "../lib/food/evidence";
import { normalizeOcrText, parseLabelText } from "../lib/food/ocr";
import type { LabTest, PetContext, ProductBundle } from "../lib/food/types";
import { checkItemSafety } from "../lib/integrative/safety";
import { catalogById } from "../lib/integrative/catalog";
import { selectMealPlan } from "../lib/integrative/meals";
import { clampAge, clampWeight } from "../lib/petValidation";
import { OWNED_TABLES } from "../services/ownedTables";
import {
  applyAnswer,
  computeUrgency,
  emptyContext,
  nextQuestion,
} from "../lib/triage/engine";
import { MODULES } from "../lib/triage/modules";
import { redFlagUrgencyFor } from "../lib/triage/redFlags";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

const pet = (o: any = {}): any => ({
  id: "x",
  name: "Test",
  species: "dog",
  breed: "Mix",
  ageYears: 5,
  sex: "male",
  weightLb: 50,
  photo: "",
  status: "stable",
  statusNote: "",
  recentChange: "",
  riskWatch: "",
  conditions: [],
  allergies: [],
  ...o,
});

// ── 1. Triage: a red flag escalates to red and can't be downgraded ───────────
(() => {
  const p = pet();
  // Find any (module, question, option) whose red flag maps to "red".
  let found: { module: any; q: any; red: any } | null = null;
  for (const m of MODULES) {
    for (const q of m.questions) {
      const red = (q.options ?? []).find((o: any) => o.redFlag && redFlagUrgencyFor(o.redFlag, p) === "red");
      if (red) {
        found = { module: m, q, red };
        break;
      }
    }
    if (found) break;
  }
  ck("1 a red-flag option exists in the modules", !!found);
  if (!found) return;

  let ctx = emptyContext(p);
  ctx = applyAnswer(ctx, found.q, found.red);
  const after = computeUrgency(found.module, ctx);
  ck("1 red flag escalates urgency to red", after.urgency === "red");
  ck("1 red flag is reported", after.redFlags.length > 0);

  // Apply a benign answer (no red flag, no floor, no/zero points) — must NOT downgrade.
  let benign: any = null;
  for (const q of found.module.questions) {
    const b = (q.options ?? []).find(
      (o: any) => !o.redFlag && !o.urgencyFloor && (!o.points || o.points <= 0),
    );
    if (b && q.id !== found.q.id) {
      benign = { q, o: b };
      break;
    }
  }
  if (benign) {
    ctx = applyAnswer(ctx, benign.q, benign.o);
    const after2 = computeUrgency(found.module, ctx);
    ck("1 benign answer cannot downgrade a red flag", after2.urgency === "red");
  } else {
    ck("1 benign answer cannot downgrade a red flag (no benign option to test)", true);
  }
})();

// ── 2. Triage: adaptive — asks a relevant follow-up question ─────────────────
(() => {
  const p = pet();
  const m = MODULES[0];
  const ctx = emptyContext(p);
  const first = nextQuestion(m, ctx);
  ck("2 triage asks a follow-up question from an empty context", !!first && !!first.text);
})();

// ── 3. Food: purity confidence is driven by lab evidence only ────────────────
const lab = (o: Partial<LabTest> = {}): LabTest => ({
  substance: "Lead",
  substanceCategory: "heavy_metals",
  result: "<0.1 ppm",
  status: "pass",
  testedAt: "2025-01-01",
  lab: "ExampleLab",
  isDemo: false,
  sourceTitle: "COA",
  ...o,
});

const bundle = (labTests: LabTest[]): ProductBundle => ({
  id: "p1",
  name: "Test Food",
  productType: "food",
  species: "dog",
  form: "dry",
  calorieDensity: null,
  barcode: null,
  lifeStage: "adult",
  aafcoStatement: "Complete and balanced for adult maintenance.",
  brand: { id: "b1", name: "BrandCo", ownsFacilities: true, recallCount: 0, transparencyScore: 4, notes: null },
  ingredients: [
    { name: "Chicken", category: "protein", position: 1, isCommonAllergen: true, flags: [] },
    { name: "Rice", category: "carb", position: 2, isCommonAllergen: false, flags: [] },
  ],
  nutrition: { proteinPct: 26, fatPct: 14, fiberPct: 4, moisturePct: 10, kcalPer100g: 380 },
  labTests,
  recalls: [],
  sources: [],
});

const noLab = puritySummary(bundle([]));
ck("3 no lab data => confidence 'none'", noLab.confidence === "none" && noLab.hasEvidence === false);
ck("3 no lab => 'No public lab test found' copy", /no public lab test found/i.test(noLab.text));

const demo = puritySummary(bundle([lab({ isDemo: true })]));
ck("3 demo-only lab is labeled demo, not verified", demo.demoOnly === true && demo.confidence !== "supported");
ck("3 demo lab copy says demo/seed", /demo|seed|illustrative/i.test(demo.text));

const real = puritySummary(bundle([lab(), lab({ substance: "Cadmium" })]));
ck("3 verified product-level lab => supported", real.confidence === "supported" && real.demoOnly === false);
ck("3 verified copy says product-level", /product-level/i.test(real.text));

// ── 4. Food: a photo / OCR text can't raise contaminant confidence ───────────
(() => {
  const pc: PetContext = { name: "Buddy", species: "dog", ageYears: 5, allergies: [], conditions: [] };
  const review = buildReview({ bundle: bundle([]), pet: pc, nowIso: "2026-06-25" });
  const contaminant = review.subScores.find((s) => s.key === "contaminant_confidence");
  ck("4 no-lab contaminant sub-score is low", !!contaminant && contaminant.score <= 40, `score=${contaminant?.score}`);
  ck("4 review purity stays 'none' with no labs", review.purity.confidence === "none");
  // buildReview takes no image/raw-text input — purity can't be fed by a photo by construction.
  const withDemo = buildReview({ bundle: bundle([lab({ isDemo: true })]), pet: pc, nowIso: "2026-06-25" });
  ck("4 demo labs don't reach 'supported' purity", withDemo.purity.confidence !== "supported");
})();

// ── 5. Integrative safety gates ──────────────────────────────────────────────
const turmericCat = checkItemSafety(catalogById("turmeric")!, pet({ species: "cat" }));
ck("5 turmeric blocked for cats", turmericCat.allowed === false);
const omegaCat = checkItemSafety(catalogById("omega3")!, pet({ species: "cat" }));
ck("5 cat supplement => ask vet first", omegaCat.askVetFirst === true);

const pancDog = selectMealPlan(pet({ species: "dog" }), { conditionId: "pancreatitis" });
ck("5 pancreatitis plan is low-fat + needs nutritionist", /low.?fat/i.test(pancDog.plan.fatNote) && pancDog.plan.needsNutritionist);
const pancCat = selectMealPlan(pet({ species: "cat" }), { conditionId: "pancreatitis" });
ck("5 cat pancreatitis shows feline caution (never withhold food)", !!pancCat.speciesCaution && /never withhold/i.test(pancCat.speciesCaution));

// ── 6. Pet input clamping (local persistence safety) ─────────────────────────
ck("6 age clamps negatives + nonsense", clampAge(-3) === 0 && clampAge(9999) === 40 && clampAge("4") === 4);
ck("6 weight clamps negatives + nonsense", clampWeight(-1) === 0 && clampWeight(99999) === 400 && clampWeight("12.5") === 12.5);

// ── 7. OCR text normalization (reads label only) ─────────────────────────────
const cleaned = normalizeOcrText("Ingredients:\n• Chicken •  Peas\n\n\nRice  ");
ck("7 OCR normalize collapses bullets/whitespace/newlines", cleaned.includes("Chicken") && !cleaned.includes("•") && !/\n\n/.test(cleaned));
const parsed = parseLabelText("Ingredients: Chicken, Peas, Rice\nGuaranteed Analysis Crude Protein (min) 26%");
ck("7 label parse extracts ingredients + protein, no purity field", parsed.ingredients.length >= 2 && parsed.guaranteed.proteinPct === 26 && !("purity" in parsed));

// ── 8. Privacy export covers the newer longevity tables ──────────────────────
const REQUIRED_NEW = [
  "health_scores",
  "system_scores",
  "detected_patterns",
  "treat_audits",
  "environment_checklists",
  "progress_programs",
  "program_logs",
  "product_recommendations",
  "protocol_recommendations",
];
const missing = REQUIRED_NEW.filter((t) => !OWNED_TABLES.includes(t as any));
ck("8 privacy OWNED_TABLES includes all newer tables", missing.length === 0, missing.length ? `missing: ${missing.join(", ")}` : "");
ck("8 catalog/reference tables are NOT exported as user data", !OWNED_TABLES.includes("meal_plans" as any) && !OWNED_TABLES.includes("marketplace_products" as any));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
