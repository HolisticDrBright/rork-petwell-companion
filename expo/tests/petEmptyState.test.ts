/**
 * Empty-pet + demo-provenance gating tests. Proves the production-readiness fixes:
 *  - the provider's pet selection tolerates ZERO pets (no crash; selectedPet null)
 *  - production never auto-seeds demo pets; demo pets are labeled by demo_key
 *  - production food queries exclude `demo_seed` products (dev/admin keep them),
 *    null-safely
 *  - demo lab rows still can't raise purity to "supported"
 *
 * Run: bun tests/petEmptyState.test.ts
 */
import { computeDataMode } from "../lib/dataMode";
import { puritySummary } from "../lib/food/evidence";
import { countsAsProductLevelPurity } from "../lib/food/provenance";
import {
  NON_DEMO_PRODUCT_FILTER,
  excludeDemoProducts,
  shouldHideDemoProducts,
} from "../lib/food/productVisibility";
import type { LabTest, ProductBundle } from "../lib/food/types";
import { isDemoPet, resolveSelectedPet } from "../lib/pets/select";
import { PETS } from "../constants/mockData";
import type { Pet } from "../types/pet";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. Zero pets must not crash the provider (selectedPet === null) ───────────
ck("1 zero pets resolves to null (no crash)", resolveSelectedPet([], "buddy") === null);
ck("1 zero pets with no persisted id resolves to null", resolveSelectedPet([], null) === null);

// ── 2. Selection works when pets exist ───────────────────────────────────────
const realPet: Pet = { ...PETS[0], id: "real-1", name: "Rex", demoKey: undefined };
ck("2 resolves an exact id match", resolveSelectedPet([realPet], "real-1")?.id === "real-1");
ck("2 falls back to the first pet when the id is unknown", resolveSelectedPet([realPet], "nope")?.id === "real-1");
const demoPet: Pet = { ...PETS[0], id: "uuid-abc", demoKey: "buddy" };
ck("2 resolves a persisted demo key to its pet", resolveSelectedPet([demoPet], "buddy")?.id === "uuid-abc");

// ── 3. Demo pets are labeled; real ones are not ──────────────────────────────
ck("3 demo pet flagged by demo_key", isDemoPet(demoPet) === true);
ck("3 real pet not flagged", isDemoPet(realPet) === false);
ck("3 null pet not flagged (no crash)", isDemoPet(null) === false);
ck(
  "3 sample pets (Buddy/Luna/Milo) carry stable demo ids → demo_key",
  PETS.length === 3 && PETS.every((p) => isDemoPet({ ...p, demoKey: p.id })),
);

// ── 4. Production never auto-seeds demo pets (the provider's seed gate) ───────
const prod = computeDataMode({ appEnv: "production", isDev: true, useDemoSupabase: "1" });
const dev = computeDataMode({ isDev: true });
const demo = computeDataMode({ appEnv: "demo", isDev: false });
ck("4 production never auto-seeds demo pets (shouldShowDemoData=false)", prod.shouldShowDemoData === false);
ck("4 development auto-seeds demo pets", dev.shouldShowDemoData === true);
ck("4 demo mode shows demo pets", demo.shouldShowDemoData === true);

// ── 5. Production food queries exclude demo_seed; dev/admin keep them ─────────
function mockQuery() {
  const calls: string[] = [];
  const q = {
    calls,
    or(f: string) {
      calls.push(f);
      return q;
    },
  };
  return q;
}
ck("5 production hides demo products", shouldHideDemoProducts(false) === true);
ck("5 dev/admin shows demo products", shouldHideDemoProducts(true) === false);

const prodQ = mockQuery();
const prodRet = excludeDemoProducts(prodQ, false);
ck("5 production applies exactly the non-demo product filter", prodQ.calls.length === 1 && prodQ.calls[0] === NON_DEMO_PRODUCT_FILTER);
ck("5 filter returns the same query builder (chainable)", prodRet === prodQ);

const devQ = mockQuery();
excludeDemoProducts(devQ, true);
ck("5 dev/admin applies NO product filter (demo visible)", devQ.calls.length === 0);

ck(
  "5 filter is null-safe (keeps NULL + non-demo, drops only demo_seed)",
  NON_DEMO_PRODUCT_FILTER.includes("evidence_status.is.null") &&
    NON_DEMO_PRODUCT_FILTER.includes("evidence_status.neq.demo_seed"),
);

// ── 6. Demo lab rows still cannot raise purity to "supported" ─────────────────
const lab = (o: Partial<LabTest> = {}): LabTest => ({
  substance: "Lead",
  substanceCategory: "heavy_metals",
  result: "<0.1 ppm",
  status: "pass",
  testedAt: "2025-01-01",
  lab: "Demo",
  isDemo: true,
  sourceTitle: "Demo COA",
  level: "product",
  evidenceStatus: "demo_seed",
  ...o,
});
const bundle = (labTests: LabTest[]): ProductBundle => ({
  id: "p1", name: "Test", productType: "food", species: "dog", form: "dry", calorieDensity: null,
  barcode: null, lifeStage: "adult", aafcoStatement: null, brand: null, ingredients: [], nutrition: null,
  labTests, recalls: [], sources: [],
});
ck("6 demo lab row never counts as product-level purity", countsAsProductLevelPurity(lab()) === false);
const demoOnly = puritySummary(bundle([lab()]));
ck("6 a product with only demo labs is never 'supported'", demoOnly.confidence !== "supported");
ck("6 demo-only purity is flagged demoOnly", demoOnly.demoOnly === true);
const forbidden = /\b(cleanest|purest|safest|verified clean|contaminant-free)\b/i;
ck("6 demo purity text makes no clean/pure/safe claim", !forbidden.test(demoOnly.text));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
