/**
 * AI safety-policy tests. The AI layer must AUGMENT, never replace, the
 * deterministic engines. These assert the pure policy (lib/ai/safety.ts), that the
 * server mirror is byte-identical, that no model API key can reach the client, and
 * that the versioned prompts encode the non-negotiable rules.
 *
 * Run: bun tests/ai.test.ts   (or: npx tsx tests/ai.test.ts)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { assessInput, refusalFor, reviewOutput, withDisclaimer, AI_DISCLAIMER } from "../lib/ai/safety";

const HERE = fileURLToPath(new URL(".", import.meta.url).href);
const p = (rel: string): string => join(HERE, rel);
const read = (rel: string): string => readFileSync(p(rel), "utf8");
const has = (rel: string): boolean => existsSync(p(rel));

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. Emergency input forces emergency-vet routing ──────────────────────────
const breathing = assessInput("My dog is having trouble breathing and collapsed");
ck("1 emergency symptom => emergency_vet routing", breathing.routing === "emergency_vet" && breathing.emergency);
ck("1 emergency sets flag", breathing.flags.includes("emergency_symptom"));
ck("1 emergency has a banner", !!breathing.banner && /emergency|right now/i.test(breathing.banner!));

const seizure = assessInput("she had a seizure last night");
ck("1 seizure => emergency", seizure.routing === "emergency_vet");
const maleCatBlock = assessInput("my cat is straining to pee and can't urinate");
ck("1 urinary blockage => emergency", maleCatBlock.routing === "emergency_vet");

// ── 2. Suspected toxin routes to poison control ──────────────────────────────
const tox = assessInput("I think my dog ate chocolate and some grapes");
ck("2 toxin => poison_control routing", tox.routing === "poison_control" && tox.toxin);
ck("2 toxin banner names a poison hotline", !!tox.banner && /poison|426-4435|764-7661/i.test(tox.banner!));
const xyl = assessInput("he got into xylitol gum");
ck("2 xylitol => toxin", xyl.toxin && xyl.routing === "poison_control");

// Emergency outranks toxin when both present.
const both = assessInput("my dog ate rat poison and is now seizing");
ck("2 emergency outranks toxin", both.routing === "emergency_vet");

// ── 3. Benign input has no forced routing ────────────────────────────────────
const benign = assessInput("what's a good routine for brushing my dog's teeth?");
ck("3 benign => no routing", benign.routing === null && !benign.emergency && !benign.toxin);

// ── 4. Output review blocks forbidden claims ─────────────────────────────────
ck("4 diagnosis claim flagged", reviewOutput("Your dog has a kidney infection.").flags.includes("diagnosis_claim"));
ck("4 dosing/treatment flagged", reviewOutput("Give him 200 mg of ibuprofen twice a day.").flags.includes("treatment_instruction"));
ck("4 purity claim flagged", reviewOutput("This is the cleanest, purest food available.").flags.includes("purity_claim"));
ck(
  "4 photo-contaminant claim flagged",
  reviewOutput("The photo shows there are no heavy metals or PFAS in this food.").flags.includes("photo_contaminant_claim"),
);
ck("4 clean explanatory text passes", reviewOutput("Here are some things to track and questions to ask your vet.").ok);

// ── 5. Refusals + disclaimer ─────────────────────────────────────────────────
ck("5 treatment refusal mentions vet", /vet/i.test(refusalFor(["treatment_instruction"])));
ck("5 purity refusal mentions lab testing", /lab/i.test(refusalFor(["purity_claim"])));
ck("5 disclaimer says not veterinary advice", /not veterinary advice/i.test(AI_DISCLAIMER));
ck("5 withDisclaimer is idempotent", withDisclaimer(withDisclaimer("hi")).split("not veterinary advice").length === 2);

// ── 6. Server safety mirror is byte-identical ────────────────────────────────
const appSafety = read("../lib/ai/safety.ts");
const edgeSafety = has("../../supabase/functions/_shared/safety.ts")
  ? read("../../supabase/functions/_shared/safety.ts")
  : "MISSING";
ck(
  "6 edge safety mirror matches app safety (no drift)",
  appSafety === edgeSafety,
  appSafety === edgeSafety ? "" : edgeSafety === "MISSING" ? "edge file missing" : "files differ — re-copy lib/ai/safety.ts",
);

// ── 7. No model API key can reach the client ─────────────────────────────────
const forbiddenClientKeys = [/EXPO_PUBLIC_OPENAI/i, /EXPO_PUBLIC_ANTHROPIC/i, /\bsk-[a-zA-Z0-9]{10,}/, /\bsk-ant-/i];
const clientFilesToScan = [
  "app.json",
  "eas.json",
  ".env",
  ".env.example",
  "lib/ai/config.ts",
  "lib/ai/safety.ts",
  "lib/ai/types.ts",
  "services/aiService.ts",
];
let keyLeak = 0;
for (const rel of clientFilesToScan) {
  if (!has(`../${rel}`)) continue;
  const txt = read(`../${rel}`);
  for (const re of forbiddenClientKeys) {
    if (re.test(txt)) {
      console.log(`  KEY LEAK in ${rel}: ${re}`);
      keyLeak++;
    }
  }
}
ck("7 no OpenAI/Anthropic key or public key var in client files", keyLeak === 0);

// The client must never reference a raw provider key env var.
const aiServiceSrc = read("../services/aiService.ts");
ck("7 aiService never reads OPENAI_API_KEY/ANTHROPIC_API_KEY", !/OPENAI_API_KEY|ANTHROPIC_API_KEY/.test(aiServiceSrc));

// ── 8. Versioned prompts encode the non-negotiable rules ─────────────────────
const sharedPrompts = has("../../supabase/functions/_shared/prompts.ts")
  ? read("../../supabase/functions/_shared/prompts.ts")
  : "";
ck("8 safety preamble bans diagnosis + dosing", /never diagnose/i.test(sharedPrompts) && /prescribe, or dose/i.test(sharedPrompts));
ck("8 safety preamble bans purity claims", /never claim a food is .*clean.*pure/i.test(sharedPrompts));
ck("8 safety preamble: photo can't detect contaminants", /photo or scan can read a label only/i.test(sharedPrompts));
ck("8 safety preamble routes poisoning to a hotline", /426-4435|764-7661/.test(sharedPrompts));
ck("8 safety preamble: do not invent", /[Nn]ever invent facts/.test(sharedPrompts));

const vetPrompt = has("../../prompts/vet-report-rewrite-v1.md") ? read("../../prompts/vet-report-rewrite-v1.md") : "";
ck("8 vet-rewrite prompt forbids new facts", /do not add any new fact|adds nothing|no new fact/i.test(vetPrompt));
ck("8 vet-rewrite prompt forbids diagnosis", /diagnos/i.test(vetPrompt));
ck("8 vet-rewrite prompt preserves red flags", /red flag/i.test(vetPrompt));
ck("8 vet-rewrite prompt says do not invent", /invent|fabricate/i.test(vetPrompt));

const recPrompt = has("../../prompts/record-summary-v1.md") ? read("../../prompts/record-summary-v1.md") : "";
ck("8 record-summary prompt forbids inventing values", /do not invent|unknown = null|not invent/i.test(recPrompt));
ck("8 record-summary prompt routes urgent findings to vet", /redFlags|red flag|veterinarian/i.test(recPrompt));
ck("8 record-summary prompt is needs_review by default", /needsReview/i.test(recPrompt) && /always true/i.test(recPrompt));
ck("8 record-summary runtime prompt present", /RECORD_SUMMARY_PROMPT/.test(sharedPrompts) && /needsReview is always true/i.test(sharedPrompts));

// ── 9. COA extraction never auto-verifies + never writes lab_tests ───────────
const coaPrompt = has("../../prompts/coa-extraction-v1.md") ? read("../../prompts/coa-extraction-v1.md") : "";
ck("9 COA prompt forbids verified_lab", /NEVER set evidenceStatus to .?verified_lab|never.*verified_lab/i.test(coaPrompt));
ck("9 COA prompt: marketing => claim_only/brand_claim", /claim_only/i.test(coaPrompt) && /brand_claim/i.test(coaPrompt));
const schemasSrc = has("../../supabase/functions/_shared/schemas.ts") ? read("../../supabase/functions/_shared/schemas.ts") : "";
// The COA schema must only allow needs_review | brand_claim for evidenceStatus.
ck("9 COA schema evidenceStatus excludes verified_lab", /evidenceStatus:\s*\{\s*type:\s*"string",\s*enum:\s*\["needs_review",\s*"brand_claim"\]/.test(schemasSrc));
const coaFnSrc = has("../../supabase/functions/ai-coa-extract/index.ts") ? read("../../supabase/functions/ai-coa-extract/index.ts") : "";
ck("9 COA function never inserts into lab_tests", !/from\(["']lab_tests["']\)|\.into\(["']lab_tests["']\)/.test(coaFnSrc) && /needs_review/.test(coaFnSrc));
ck("9 COA function is admin-gated", /isAdmin\(/.test(coaFnSrc));

// ── 10. Food-label vision: label only, never contaminant confidence ──────────
const visPrompt = has("../../prompts/food-label-vision-v1.md") ? read("../../prompts/food-label-vision-v1.md") : "";
ck("10 vision prompt: reads label only", /label only|reads the label only|LABEL ONLY/i.test(visPrompt));
ck("10 vision prompt: never contaminants from photo", /never (infer|state).*(contaminant|heavy metal|pfas)/i.test(visPrompt));
ck("10 vision prompt: never score/judge food", /never score|never.*judge|rank/i.test(visPrompt));
const visFnSrc = has("../../supabase/functions/ai-vision-label/index.ts") ? read("../../supabase/functions/ai-vision-label/index.ts") : "";
ck("10 vision function forces needsReview", /needsReview = true/.test(visFnSrc));
ck("10 vision function logs crowdsourced/unverified", /label_ocr_unverified|crowdsourced/.test(visFnSrc));
// The label-extraction schema has no field that could express contaminant confidence.
ck("10 label schema has no contaminant/purity field", !/contaminant|purity|heavy_?metal|pfas/i.test(/labelExtractionSchema[\s\S]*?\};/.exec(schemasSrc)?.[0] ?? ""));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
