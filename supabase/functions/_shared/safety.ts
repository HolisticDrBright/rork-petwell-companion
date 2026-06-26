/**
 * AI SAFETY POLICY — pure, dependency-free, and the single most important file in
 * the AI layer. It is MIRRORED verbatim in supabase/functions/_shared/safety.ts
 * (the authoritative server-side gate); keep the two in sync. No imports so it can
 * run in the app (Metro/Hermes), the test runner (bun/tsx), and Deno edge functions.
 *
 * What it guarantees:
 *  - Emergency symptoms in user input force emergency-vet routing (AI can't lower it).
 *  - Suspected poison/toxin input routes to poison control.
 *  - AI output is scanned for diagnosis claims, treatment/dosing instructions,
 *    food-purity claims, and "photo detects contaminants" claims — these are
 *    flagged (and callers refuse/replace them). AI augments; it never diagnoses,
 *    treats, or overrides the deterministic engines.
 */

export type SafetyRouting = "emergency_vet" | "poison_control" | null;

export interface SafetyAssessment {
  /** A life-threatening symptom was mentioned — show the emergency banner. */
  emergency: boolean;
  /** A possible poisoning/toxin exposure was mentioned. */
  toxin: boolean;
  /** Highest-priority deterministic route, or null. emergency_vet > poison_control. */
  routing: SafetyRouting;
  /** Machine-readable flags persisted to ai_generations.safety_flags. */
  flags: string[];
  /** User-facing banner text when routing is set, else null. */
  banner: string | null;
}

// Life-threatening symptoms → emergency vet now. Conservative and broad.
const EMERGENCY_TERMS: RegExp[] = [
  /\b(can'?t|cannot|trouble|difficulty|labou?red|struggling to)\s+breath/i,
  /\bnot breathing\b/i,
  /\bchoking\b/i,
  /\bcollaps/i,
  /\bfaint/i,
  /\bunconscious\b/i,
  /\bunresponsive\b/i,
  /\bwon'?t wake|can'?t (wake|rouse)|hard to rouse\b/i,
  /\bseizure|seizing|convuls/i,
  /\b(pale|white|blue|grey|gray)\s+gums?\b/i,
  /\bbloat(ed|ing)?\b/i,
  /\bdistended (abdomen|belly|stomach)\b/i,
  /\b(can'?t|cannot|straining to|unable to)\s+(pee|urinat)/i,
  /\bblood (in|from)\s+(the\s+)?(vomit|stool|urine|nose)\b/i,
  /\bvomiting blood|bloody (vomit|stool|diarrhea)\b/i,
  /\bhit by (a )?car\b/i,
  /\b(severe|heavy|won'?t stop) bleeding\b/i,
  /\bbroken bone|compound fracture\b/i,
  /\bheat ?stroke\b/i,
  /\bnonstop|repeated|continuous\s+(vomiting|seizure)/i,
];

// Possible poisoning / toxic exposure → poison control + vet.
const TOXIN_TERMS: RegExp[] = [
  /\bpoison/i,
  /\btoxic\b/i,
  // Unambiguous, high-danger toxins — match on their own (no "ate" needed).
  /\b(xylitol|antifreeze|ethylene glycol|rodenticide|rat poison|slug bait|insecticide)\b/i,
  /\bate (a |an |some )?(rat|mouse|rodent|snail|slug)?\s*(bait|poison)\b/i,
  // Common foods/substances — gated behind an ingestion verb to avoid false hits
  // (e.g. "chocolate lab", "garlic bread recipe").
  /\b(ate|ingested|swallowed|got into|chewed|licked|drank)\b[^.]*\b(chocolate|grape|raisin|onion|garlic|macadamia|lily|sago|marijuana|cannabis|thc|edible|gum|cleaner|bleach|detergent|medication|pills?|human meds?|essential oil)\b/i,
  /\boverdose\b/i,
];

const POISON_HOTLINES =
  "Call your vet or a poison hotline now — ASPCA Animal Poison Control 1-888-426-4435 or Pet Poison Helpline 1-855-764-7661.";

function anyMatch(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

/**
 * Assess raw user input BEFORE any model call. The result drives deterministic
 * routing that the AI cannot override.
 */
export function assessInput(text: string): SafetyAssessment {
  const t = (text || "").slice(0, 4000);
  const emergency = anyMatch(EMERGENCY_TERMS, t);
  const toxin = anyMatch(TOXIN_TERMS, t);
  const flags: string[] = [];
  if (emergency) flags.push("emergency_symptom");
  if (toxin) flags.push("possible_toxin");
  const routing: SafetyRouting = emergency ? "emergency_vet" : toxin ? "poison_control" : null;
  const banner =
    routing === "emergency_vet"
      ? "This may be an emergency. Contact your veterinarian or the nearest emergency animal hospital right now."
      : routing === "poison_control"
        ? `Possible poisoning is an emergency. ${POISON_HOTLINES}`
        : null;
  return { emergency, toxin, routing, flags, banner };
}

// ── Output review: claims the AI must never make ─────────────────────────────
const DIAGNOSIS_PATTERNS: RegExp[] = [
  /\byour (dog|cat|pet|animal)\s+(has|likely has|is suffering from|definitely has)\b/i,
  /\b(it'?s|this is|that'?s)\s+(definitely|certainly|clearly)\s+(a|an)\b/i,
  /\bi (can )?diagnos/i,
  /\bthe diagnosis is\b/i,
  /\byou (have|']?ve got) (a|an)\b.*\b(infection|disease|cancer|failure|tumou?r)\b/i,
];
const TREATMENT_PATTERNS: RegExp[] = [
  /\bgive (him|her|them|your (dog|cat|pet))\b[^.]*\b(\d|mg|ml|tablet|capsule|dose|teaspoon|tablespoon)/i,
  /\b(administer|inject|prescribe)\b/i,
  /\b(dose|dosage)\s+(of|is|:)/i,
  /\byou should give\b[^.]*\b(medication|medicine|drug|antibiotic|painkiller|ibuprofen|tylenol|aspirin)\b/i,
  /\b(induce|make (him|her|them|your pet) vomit)\b/i,
];
const PURITY_PATTERNS: RegExp[] = [
  /\b(cleanest|purest|safest)\b/i,
  /\bverified clean\b/i,
  /\bguaranteed (pure|safe|clean|contaminant)/i,
  /\b(this|the) (food|product) is (pure|clean|contaminant-free|free of (heavy metals|contaminants))\b/i,
];
const PHOTO_CONTAMINANT_PATTERNS: RegExp[] = [
  /\b(photo|image|picture|scan)\b[^.]*\b(detect|show|reveal|confirm|measure)s?\b[^.]*\b(heavy metal|lead|arsenic|cadmium|mercury|pfas|pesticide|microplastic|mycotoxin|plasticizer|bpa)/i,
  /\b(no|low|free of)\s+(heavy metals?|contaminants?|pfas|pesticides?)\b[^.]*\b(from|based on|in) (the )?(photo|image|picture|label)/i,
];

export interface OutputReview {
  /** Forbidden-content flags found in the AI text (empty = clean). */
  flags: string[];
  /** True when nothing forbidden was found. */
  ok: boolean;
}

/**
 * Review AI-GENERATED text for forbidden claims. Callers must refuse or replace
 * any output where ok === false (see refusalFor). Pure detection — no mutation.
 */
export function reviewOutput(text: string): OutputReview {
  const t = text || "";
  const flags: string[] = [];
  if (anyMatch(DIAGNOSIS_PATTERNS, t)) flags.push("diagnosis_claim");
  if (anyMatch(TREATMENT_PATTERNS, t)) flags.push("treatment_instruction");
  if (anyMatch(PURITY_PATTERNS, t)) flags.push("purity_claim");
  if (anyMatch(PHOTO_CONTAMINANT_PATTERNS, t)) flags.push("photo_contaminant_claim");
  return { flags, ok: flags.length === 0 };
}

/** Standardized, conservative replacement shown when output is refused. */
export function refusalFor(flags: string[]): string {
  if (flags.includes("treatment_instruction") || flags.includes("diagnosis_claim")) {
    return "I can't diagnose or recommend treatment — that needs a veterinarian. I can help you note what to watch for and what to ask your vet.";
  }
  if (flags.includes("purity_claim") || flags.includes("photo_contaminant_claim")) {
    return "I can't say a food is clean or pure — that requires independent, product-level lab testing, and a photo can't detect contaminants.";
  }
  return "I can't help with that part, but I can share general information to discuss with your vet.";
}

export const AI_DISCLAIMER =
  "AI-generated · informational only, not veterinary advice. For urgent symptoms or suspected poisoning, contact your veterinarian or an emergency clinic.";

/** Ensure the standing disclaimer is present exactly once. */
export function withDisclaimer(text: string): string {
  const t = (text || "").trim();
  if (t.toLowerCase().includes("not veterinary advice")) return t;
  return `${t}\n\n${AI_DISCLAIMER}`;
}
