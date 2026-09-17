/**
 * Production data-mode gating tests. Proves production builds require a backend,
 * never enable demo data or the shared demo Supabase project, and that demo lab
 * rows can never be promoted to verified / clean / high-confidence purity.
 *
 * Run: bun tests/dataMode.test.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { computeDataMode } from "../lib/dataMode";
import { NON_DEMO_PRODUCT_FILTER, shouldHideDemoProducts } from "../lib/food/productVisibility";
import { countsAsProductLevelPurity } from "../lib/food/provenance";
import { puritySummary } from "../lib/food/evidence";
import type { LabTest, ProductBundle } from "../lib/food/types";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. Production mode ───────────────────────────────────────────────────────
const prod = computeDataMode({ appEnv: "production", isDev: true, useDemoSupabase: "1" });
ck("1 production => isProductionBuild", prod.isProductionBuild);
ck("1 production requires backend", prod.shouldRequireBackend);
ck("1 production never shows demo data", !prod.shouldShowDemoData && !prod.isDemoModeAllowed);
ck("1 production disallows local fallback", !prod.isLocalFallbackAllowed);
ck("1 production refuses demo Supabase even with opt-in flag", !prod.demoSupabaseAllowed);

// A release build with no override (isDev false) defaults to production.
const release = computeDataMode({ isDev: false });
ck("1 release build (no override) defaults to production", release.mode === "production" && release.shouldRequireBackend);

// ── 2. Development mode ──────────────────────────────────────────────────────
const dev = computeDataMode({ isDev: true });
ck("2 __DEV__ defaults to development", dev.mode === "development");
ck("2 development shows demo data + allows local fallback", dev.shouldShowDemoData && dev.isLocalFallbackAllowed && !dev.shouldRequireBackend);
const devDemoSb = computeDataMode({ isDev: true, useDemoSupabase: "1" });
ck("2 demo Supabase allowed only with explicit opt-in (dev)", devDemoSb.demoSupabaseAllowed && !dev.demoSupabaseAllowed);

// ── 3. Demo mode ─────────────────────────────────────────────────────────────
const demo = computeDataMode({ appEnv: "demo", isDev: false });
ck("3 demo mode shows demo data, not production", demo.shouldShowDemoData && !demo.isProductionBuild);

// ── 4. Demo lab rows can never become verified/clean/high purity ─────────────
const lab = (o: Partial<LabTest> = {}): LabTest => ({
  substance: "Lead",
  substanceCategory: "heavy_metals",
  result: "<0.1 ppm",
  status: "pass",
  testedAt: "2025-01-01",
  lab: "DemoLab",
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

ck("4 demo row never counts as product-level purity", countsAsProductLevelPurity(lab()) === false);
const demoOnly = puritySummary(bundle([lab(), lab({ substance: "Cadmium" })]));
ck("4 demo-only purity is never 'supported'", demoOnly.confidence !== "supported");
ck("4 demo-only purity is flagged demoOnly", demoOnly.demoOnly === true);
const forbidden = /\b(cleanest|purest|safest|verified clean|contaminant-free)\b/i;
ck("4 demo purity text makes no clean/pure/safe claim", !forbidden.test(demoOnly.text));

// Even mixing a demo row with a real brand-level row stays sub-product-level.
const mixed = puritySummary(bundle([lab(), lab({ isDemo: false, evidenceStatus: "brand_claim", level: "brand" })]));
ck("4 demo + brand-level never reaches 'supported'", mixed.confidence !== "supported");

// ── 5. Demo isolation: sample data can't leak into a production build ───────
// Mock pets, sample vet records and the frozen demo date live in
// constants/mockData. Every module that touches them must gate on the data
// mode; a new ungated importer fails this test rather than shipping fake
// medical history to a real owner.
const EXPO_ROOT = join(fileURLToPath(new URL(".", import.meta.url).href), "..");
const rd = (rel: string): string => readFileSync(join(EXPO_ROOT, rel), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(EXPO_ROOT, dir), { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry.name)) out.push(rel);
  }
  return out;
}
const appSources = ["app", "components", "lib", "services", "providers"].flatMap(sourceFiles);
const mockImporters = appSources.filter((f) => /from "@\/constants\/mockData"/.test(rd(f)));
// petsService only reaches the demo pets through ensureDemoData(), which is
// called behind the data-mode gate and the explicit "Try a demo profile" action.
const GATED_BY_CALLER = ["services/petsService.ts"];
ck("5 the demo-data scan found the modules that import mock data", mockImporters.length >= 5, `${mockImporters.length} found`);
const ungated = mockImporters.filter(
  (f) => !GATED_BY_CALLER.includes(f) && !/shouldShowDemoData|isDemoModeAllowed/.test(rd(f)),
);
ck("5 every module using mock data gates on the data mode", ungated.length === 0, ungated.join(", "));
ck("5 the caller-gated exception list stays exactly one known module", GATED_BY_CALLER.every((f) => mockImporters.includes(f)) && GATED_BY_CALLER.length === 1);
const petsServiceSrc = rd("services/petsService.ts");
ck("5 mock pets are only reachable through ensureDemoData()", /async ensureDemoData\(\)[\s\S]*?for \(const pet of PETS\)/.test(petsServiceSrc));
ck("5 demo seeding is a no-op once the account has real pets", /count \?\? 0\) > 0\) return/.test(petsServiceSrc));
const providerSrc = rd("providers/PetProvider.tsx");
ck("5 automatic demo seeding is gated on the data mode", /remote" && shouldShowDemoData/.test(providerSrc));
ck("5 the frozen demo date never becomes 'today' in production", /shouldShowDemoData \? TODAY_ISO : new Date\(\)/.test(providerSrc));
ck("5 sample vet records are gated on every screen that reads them", ["app/(tabs)/records.tsx", "app/log.tsx", "app/vet-report.tsx"].every((f) => /shouldShowDemoData/.test(rd(f))));
ck("5 the unbuilt devices screen is hidden in production, deep link included", /!shouldShowDemoData/.test(rd("app/devices.tsx")) && /shouldShowDemoData \?/.test(rd("app/settings.tsx")));
ck("5 the demo-profile affordance is an explicit, off-by-default opt-in", /demoModeEnabled = dataMode\.shouldShowDemoData \|\| boolEnv/.test(rd("lib/config.ts")));

// Demo/seed PRODUCTS are hidden by a null-safe filter — a plain <> comparison
// would also drop real, not-yet-graded rows.
ck("5 production hides demo products; dev sees them", shouldHideDemoProducts(false) && !shouldHideDemoProducts(true));
ck("5 the product filter keeps ungraded (null) rows", NON_DEMO_PRODUCT_FILTER.includes("evidence_status.is.null") && NON_DEMO_PRODUCT_FILTER.includes("evidence_status.neq.demo_seed"));
const foodSrc = rd("services/foodService.ts");
ck("5 every user-facing food query excludes demo products", (foodSrc.match(/excludeDemoProducts\(/g) ?? []).length >= 4);
ck("5 the marketplace excludes demo products too", /excludeDemoProducts\(/.test(rd("services/marketplaceService.ts")));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
