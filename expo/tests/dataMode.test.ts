/**
 * Production data-mode gating tests. Proves production builds require a backend,
 * never enable demo data or the shared demo Supabase project, and that demo lab
 * rows can never be promoted to verified / clean / high-confidence purity.
 *
 * Run: bun tests/dataMode.test.ts
 */
import { computeDataMode } from "../lib/dataMode";
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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
