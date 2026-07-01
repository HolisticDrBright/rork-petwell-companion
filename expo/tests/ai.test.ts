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

// ── 11. Explain wrapper adds no new conclusions, preserves urgency ───────────
const explainPrompt = has("../../prompts/explain-v1.md") ? read("../../prompts/explain-v1.md") : "";
ck("11 explain prompt: add no new conclusion", /not add any new conclusion|do not.*change.*result|explain the existing result/i.test(explainPrompt));
ck("11 explain prompt: preserve urgency", /urgency/i.test(explainPrompt) && /emergency/i.test(explainPrompt));
ck("11 explain prompt: preserve evidence status", /no public lab test found|evidence status/i.test(explainPrompt));
const explainFnSrc = has("../../supabase/functions/ai-explain/index.ts") ? read("../../supabase/functions/ai-explain/index.ts") : "";
ck("11 explain function reviews output + flags urgent", /reviewOutput\(/.test(explainFnSrc) && /emergency_vet/.test(explainFnSrc));

// ── 12. Chat: deterministic emergency priority, never diagnoses ──────────────
const chatPrompt = has("../../prompts/ai-chat-v1.md") ? read("../../prompts/ai-chat-v1.md") : "";
ck("12 chat prompt forbids diagnosis + dosing", /do not diagnose/i.test(chatPrompt) && /prescribe, or dose/i.test(chatPrompt));
ck("12 chat prompt: emergency leads, poison hotline", /426-4435|764-7661/.test(chatPrompt) && /emergency/i.test(chatPrompt));
const chatFnSrc = has("../../supabase/functions/ai-chat/index.ts") ? read("../../supabase/functions/ai-chat/index.ts") : "";
ck("12 chat runs deterministic safety BEFORE the model", /assessInput\(message\)/.test(chatFnSrc) && chatFnSrc.indexOf("assessInput(message)") < chatFnSrc.indexOf("provider.generate"));
ck("12 chat prepends deterministic banner to reply", /safety\.banner.*\n?.*reply =/s.test(chatFnSrc) || /\$\{safety\.banner\}/.test(chatFnSrc));
ck("12 chat reviews + refuses forbidden output", /reviewOutput\(reply\)/.test(chatFnSrc) && /refusalFor/.test(chatFnSrc));

// ── 13. Care plan: gated, suppresses gentle options on red flags ─────────────
const planPrompt = has("../../prompts/care-plan-v1.md") ? read("../../prompts/care-plan-v1.md") : "";
ck("13 care-plan prompt: no added treatments/dose", /do not add any supplement|never dose/i.test(planPrompt));
ck("13 care-plan prompt: red flags => no gentle options", /gentleOptions:\s*\[\]|no gentle options/i.test(planPrompt));
const planFnSrc = has("../../supabase/functions/ai-care-plan/index.ts") ? read("../../supabase/functions/ai-care-plan/index.ts") : "";
ck("13 care-plan function enforces suppression server-side", /redFlagged/.test(planFnSrc) && /gentleOptions = \[\]/.test(planFnSrc) && /redFlagsSuppressed = true/.test(planFnSrc));

// ── 14. Sentry never logs AI prompts / PII ───────────────────────────────────
const sentrySrc = read("../lib/sentry.ts");
ck("14 sentry sendDefaultPii is false", /sendDefaultPii:\s*false/.test(sentrySrc));
ck("14 sentry beforeSend scrubs prompt/record/pet fields", /beforeSend/.test(sentrySrc) && /prompt\|message\|content\|record/.test(sentrySrc));
ck("14 sentry drops request + user", /delete event\.request/.test(sentrySrc) && /delete event\.user/.test(sentrySrc));

// ── 15. Post-audit regression guards (real bugs found + fixed) ───────────────
// The canonical pet table is pet_profiles, not pets. A `pets` reference breaks
// `supabase db reset` at migration 0018 and silently drops chat pet-context.
const mig0018 = has("../../supabase/migrations/0018_ai_layer.sql") ? read("../../supabase/migrations/0018_ai_layer.sql") : "";
ck("15 migration 0018 references pet_profiles, not pets", /references public\.pet_profiles\(id\)/.test(mig0018) && !/references public\.pets\(/.test(mig0018));
ck("15 ai-chat queries pet_profiles, not pets", /from\("pet_profiles"\)/.test(chatFnSrc) && !/from\("pets"\)/.test(chatFnSrc));
// Care-plan red-flag gate must catch vet-first (orange/red), not just emergencyOverride.
ck("15 care-plan gate catches orange/red urgency", /urgency.{0,12}(orange|red)/i.test(planFnSrc));
// Chat poison banner must key on hotline numbers, not the generic word "emergency".
ck("15 chat banner gate keys on hotline numbers", /426-4435/.test(chatFnSrc) && /764-7661/.test(chatFnSrc));
// searchToxins must guard short aliases against substring-matching any query.
const searchSrc = read("../lib/toxins/search.ts");
ck("15 searchToxins guards short-alias substring match", /a\.length >= 3 && q\.includes\(a\)/.test(searchSrc));

// ── 16. Symptom vision: observations only, deterministic routing, real triage ─
const symPrompt = has("../../prompts/symptom-vision-v1.md") ? read("../../prompts/symptom-vision-v1.md") : "";
ck("16 symptom-vision prompt exists", symPrompt.length > 0);
ck("16 symptom prompt: observable only, no disease", /observable/i.test(symPrompt) && /never name a disease|do not.*diagnos/i.test(symPrompt));
ck("16 symptom prompt: never score/rate/urgency", /never assign a score|no score|rating|severity level|urgency/i.test(symPrompt));
ck("16 symptom prompt: never treat/dose", /never (recommend|prescribe|.*dose)|do not.*treat/i.test(symPrompt));
// Authoritative server prompt (sharedPrompts) carries the same rules.
ck("16 server SYMPTOM_VISION_PROMPT present + observation-only", /SYMPTOM_VISION_PROMPT/.test(sharedPrompts) && /never assign a score/i.test(sharedPrompts));

// The observation schema cannot express a diagnosis, score, or urgency.
const symSchema = /symptomObservationSchema[\s\S]*?\n};/.exec(schemasSrc)?.[0] ?? "";
ck("16 symptom schema has observedRedFlags + observations", /observedRedFlags/.test(symSchema) && /observations/.test(symSchema));
ck("16 symptom schema has no diagnosis/score/urgency/severity field", !/diagnos|score|urgency|severity|grade|rating/i.test(symSchema));
ck("16 symptom schema is strict (additionalProperties:false)", /additionalProperties:\s*false/.test(symSchema));

// The function decides routing deterministically — not the model.
const symFnSrc = has("../../supabase/functions/ai-vision-symptom/index.ts")
  ? read("../../supabase/functions/ai-vision-symptom/index.ts")
  : "";
ck("16 symptom function exists", symFnSrc.length > 0);
ck("16 symptom function runs deterministic assessInput on notes", /assessInput\(notes\)/.test(symFnSrc));
ck("16 symptom function maps observed red flags → emergency routing (server rule)", /observedRedFlags/.test(symFnSrc) && /emergency_vet/.test(symFnSrc) && /textAssess\.routing/.test(symFnSrc));
ck("16 symptom function reviews output + neutralizes forbidden claims", /reviewOutput\(/.test(symFnSrc) && /output_neutralized/.test(symFnSrc));
ck("16 symptom function is needs_review + scoped to owner", /needs_review/.test(symFnSrc) && /startsWith\(`\$\{ctx\.caller\.userId\}\//.test(symFnSrc));

// Client: opt-in gated, and the UI hands off to the REAL rule-based triage.
ck("16 observeSymptomPhoto gates on document opt-in", /observeSymptomPhoto[\s\S]*?gate<SymptomObservation>\(\{ needsDocs: true \}\)/.test(aiServiceSrc));
const scanResultSrc = read("../app/scan-result.tsx");
ck("16 scan-result hands off to guided triage (ask-flow)", /ai-vision-symptom|observeSymptomPhoto/.test(scanResultSrc) && /pathname: "\/ask-flow"/.test(scanResultSrc));
const aiTypesSrc = read("../lib/ai/types.ts");
ck("16 SymptomObservation type carries no diagnosis/score field", /interface SymptomObservation/.test(aiTypesSrc) && !/diagnos|score/i.test(/interface SymptomObservation[\s\S]*?\n}/.exec(aiTypesSrc)?.[0] ?? ""));
// Regression: 0018's feature CHECK predates symptom_vision — without 0022 the
// logGeneration insert is silently dropped AND those calls escape the budget
// (checkBudget counts ai_generations rows).
const mig0022 = has("../../supabase/migrations/0022_symptom_vision_logging.sql")
  ? read("../../supabase/migrations/0022_symptom_vision_logging.sql")
  : "";
ck("16 migration 0022 allows feature 'symptom_vision' (budget/audit logging works)", /'symptom_vision'/.test(mig0022) && /ai_generations_feature_check/.test(mig0022));
// 0017 moved is_admin() to the private schema and DROPPED public.is_admin() —
// any later migration referencing public.is_admin() fails on a fresh db reset.
const mig0021 = has("../../supabase/migrations/0021_symptom_kb.sql") ? read("../../supabase/migrations/0021_symptom_kb.sql") : "";
ck("16 post-0017 migrations use private.is_admin(), never public.is_admin()", !/public\.is_admin\(\)/.test(mig0018) && !/public\.is_admin\(\)/.test(mig0021) && /private\.is_admin\(\)/.test(mig0018) && /private\.is_admin\(\)/.test(mig0021));
ck("16 symptom function logs the feature the constraint allows", /feature: "symptom_vision"/.test(symFnSrc));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
