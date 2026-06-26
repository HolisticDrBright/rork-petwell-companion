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

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
