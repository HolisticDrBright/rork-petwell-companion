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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

// ── 7. "Nothing here" vs "couldn't load" are never the same screen ──────────
// An empty timeline reads as "you haven't logged anything". Showing that to
// someone who is merely offline tells them something false about their pet's
// records — and a health score computed from an empty array is a confident
// claim backed by no data at all. Every screen derived from a fetch must be
// able to tell the two apart, and must offer a way back.
const ROOT = join(fileURLToPath(new URL(".", import.meta.url).href), "..");
const file = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const providerSource = file("providers/PetProvider.tsx");
ck("7 the provider exposes the pet-list failure, not just its data", /petsFailed: remoteMode && petsQuery\.isError/.test(providerSource) && /retryPets/.test(providerSource));
ck("7 the provider exposes the timeline failure, not just its data", /timelineFailed: remoteMode && timelineQuery\.isError/.test(providerSource) && /retryTimeline/.test(providerSource));

ck("7 the shared load-failure state exists with a retry", /export const LoadFailed/.test(file("components/ui.tsx")) && /onRetry/.test(file("components/ui.tsx")));

// Screens built on the timeline must branch on the failure BEFORE they render
// derived findings.
for (const [screen, label] of [
  ["app/(tabs)/timeline.tsx", "timeline"],
  ["app/patterns.tsx", "patterns"],
  ["app/health-score.tsx", "health score"],
] as const) {
  const s = file(screen);
  ck(`7 ${label} distinguishes a failed load from an empty one`, /timelineFailed/.test(s) && /<LoadFailed/.test(s));
  ck(`7 ${label} offers a retry`, /onRetry=\{retryTimeline\}/.test(s));
}
ck("7 the health score refuses to score on data that didn't load", /if \(timelineFailed\) \{[\s\S]{0,700}Can't score right now/.test(file("app/health-score.tsx")));
ck("7 patterns never reports 'no patterns' when the logs failed", /timelineFailed \?[\s\S]{0,800}No clear patterns yet/.test(file("app/patterns.tsx")));
ck("7 Today hides the score rather than computing it from nothing", /timelineFailed \?[\s\S]{0,200}Score unavailable/.test(file("app/(tabs)/index.tsx")));

// The tab shell must not spin forever when the pet list can't be fetched.
const tabLayout = file("app/(tabs)/_layout.tsx");
ck("7 the tab shell surfaces a pet-list failure instead of spinning", /if \(petsFailed\)/.test(tabLayout) && /<LoadFailed/.test(tabLayout));
ck("7 that failure state offers a retry", /onRetry=\{retryPets\}/.test(tabLayout));

// Records + marketplace: their own load paths, same rule.
const recordsSrc = file("app/(tabs)/records.tsx");
ck("7 records separates loading, failure and empty", /remoteLoading \?/.test(recordsSrc) && /remoteError \?/.test(recordsSrc) && /Object\.keys\(sections\)\.length === 0/.test(recordsSrc));
ck("7 records offers a retry on failure", /recordsQuery\.refetch\(\)/.test(recordsSrc));
const marketSrc = file("app/marketplace.tsx");
ck("7 the marketplace records a failed catalog fetch instead of swallowing it", /setCatalogFailed\(true\)/.test(marketSrc));
ck("7 a failed catalog is labelled as stale data, not a 'research preview'", /catalogFailed[\s\S]{0,400}couldn't reach the reviewed catalog/i.test(marketSrc));
ck("7 the marketplace offers a retry", /onRetry=\{\(\) => setReloadKey/.test(marketSrc));

// ── 8. Finishing onboarding actually gets you into the app ──────────────────
// Regression: completeOnboarding() wrote the flag and then navigated, but the
// provider hadn't re-rendered yet, so Today read onboarded=false and bounced
// straight back — restarting the tour at step 1. Every new user hit it, and
// only a full app restart escaped. Two independent guards now:
//   1. the new value is published to the query cache SYNCHRONOUSLY, before any
//      navigation, so the next render already knows;
//   2. the onboarding screen redirects out if it is ever shown to someone who
//      has already finished, so no timing bug can strand them again.
ck(
  "8 completeOnboarding publishes the flag synchronously before navigating",
  /setQueryData\(\["petwell-onboarded"\], true\)/.test(providerSource) &&
    providerSource.indexOf('setQueryData(["petwell-onboarded"], true)') <
      providerSource.indexOf("await onboardQuery.refetch()"),
);
const onboardingSrc = file("app/onboarding.tsx");
ck(
  "8 onboarding sends an already-onboarded user into the app",
  /if \(!isLoading && onboarded\) router\.replace\("\/\(tabs\)"\)/.test(onboardingSrc),
);
ck("8 the finish button still persists before it navigates", /await completeOnboarding\(\);\s*\n\s*router\.replace\("\/\(tabs\)"\)/.test(onboardingSrc));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
