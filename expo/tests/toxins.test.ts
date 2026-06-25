/**
 * Toxin database safety-critical tests (pure functions). Run from expo/:
 *   bun tests/toxins.test.ts
 *
 * Covers the non-negotiable safety behaviors:
 *  - dogs & cats only (V1 scope)
 *  - lookup works by name + alias; species scoping never hides a hazard wrongly
 *  - a no-match result is empty AND the "not found ≠ safe" copy exists
 *  - NO dosing / treatment / first-aid language anywhere in the data
 *  - every entry carries provenance (source, last-reviewed date, review status)
 *  - the two poison-control hotline numbers are exactly correct
 */
import { EMERGENCY_CONTACTS, NOT_FOUND_NOT_SAFE, NO_TREATMENT_NOTE } from "../lib/toxins/contacts";
import { TOXINS } from "../lib/toxins/data";
import {
  findToxinsInText,
  getToxin,
  pendingVetReview,
  searchToxins,
  toxinsForSpecies,
} from "../lib/toxins/lookup";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. Scope: at least 50 toxins, dogs & cats only ───────────────────────────
ck("1 ships the first 50 highest-priority toxins", TOXINS.length >= 50, `count=${TOXINS.length}`);
const SPECIES_OK = new Set(["dog", "cat", "both"]);
ck("1 every entry is dog/cat/both only (V1 scope)", TOXINS.every((t) => SPECIES_OK.has(t.species)));
const CATS_OK = new Set(["food", "plant", "household", "medication", "rodenticide", "essential_oil"]);
ck("1 categories are within the allowed set", TOXINS.every((t) => CATS_OK.has(t.category)));
const SEV_OK = new Set(["toxic", "high", "caution"]);
ck("1 severities are within the allowed set", TOXINS.every((t) => SEV_OK.has(t.severity)));
ck("1 slugs are unique", new Set(TOXINS.map((t) => t.slug)).size === TOXINS.length);

// ── 2. Provenance: source + last-reviewed + review status on every entry ─────
const provOk = TOXINS.every(
  (t) =>
    !!t.source?.name &&
    /^https?:\/\//.test(t.source?.url ?? "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(t.lastReviewed) &&
    (t.reviewStatus === "curated_public_source" || t.reviewStatus === "vet_reviewed") &&
    t.signs.length > 0 &&
    t.bodySystems.length > 0 &&
    t.note.length > 0,
);
ck("2 every entry has source URL, ISO last-reviewed date, status, signs, note", provOk);

// ── 3. NO dosing / treatment / first-aid language anywhere ───────────────────
const FORBIDDEN = [
  "induce vomiting",
  "hydrogen peroxide",
  "activated charcoal",
  "antidote",
  "mg/kg",
  "ml/kg",
  "dosage",
  "dosing",
  "overdose",
  "administer",
  "first aid",
  "first-aid",
  "teaspoon",
  "tablespoon",
];
const offenders: string[] = [];
for (const t of TOXINS) {
  const blob = `${t.name} ${t.note} ${t.signs.join(" ")} ${t.bodySystems.join(" ")}`.toLowerCase();
  for (const term of FORBIDDEN) if (blob.includes(term)) offenders.push(`${t.slug}:${term}`);
  if (/\bdose(s|d)?\b/.test(blob) || /\bgive\b/.test(blob) || /\btreat\b/.test(blob)) offenders.push(`${t.slug}:dose/give/treat`);
}
ck("3 no dosing/treatment/first-aid language in any entry", offenders.length === 0, offenders.join(", "));
ck("3 a standing 'no treatment' note exists", /treatment|first-aid|dose/i.test(NO_TREATMENT_NOTE));

// ── 4. Emergency contacts: exact hotline numbers ─────────────────────────────
const aspca = EMERGENCY_CONTACTS.find((c) => c.id === "aspca_apcc");
const pph = EMERGENCY_CONTACTS.find((c) => c.id === "pet_poison_helpline");
ck("4 ASPCA APCC number is 888-426-4435", !!aspca && aspca.display === "(888) 426-4435" && aspca.tel === "tel:+18884264435");
ck("4 Pet Poison Helpline number is 855-764-7661", !!pph && pph.display === "(855) 764-7661" && pph.tel === "tel:+18557647661");
ck("4 both contacts have a website link", EMERGENCY_CONTACTS.every((c) => /^https:\/\//.test(c.url)) && EMERGENCY_CONTACTS.length === 2);

// ── 5. Lookup by name + alias ────────────────────────────────────────────────
ck("5 finds a toxin by name", searchToxins("xylitol").some((t) => t.slug === "xylitol"));
ck("5 finds a toxin by alias (birch sugar -> xylitol)", searchToxins("birch sugar").some((t) => t.slug === "xylitol"));
ck("5 finds acetaminophen by brand alias (tylenol)", searchToxins("tylenol").some((t) => t.slug === "acetaminophen"));
ck("5 getToxin returns by slug, undefined for unknown", !!getToxin("chocolate") && getToxin("does-not-exist") === undefined);

// ── 6. Species scoping never hides a hazard wrongly ──────────────────────────
const catList = toxinsForSpecies("cat");
const dogList = toxinsForSpecies("dog");
ck("6 cats see the cat-only lily; dogs do not", catList.some((t) => t.slug === "lily-true") && !dogList.some((t) => t.slug === "lily-true"));
ck("6 dogs see dog-only macadamia; cats do not", dogList.some((t) => t.slug === "macadamia") && !catList.some((t) => t.slug === "macadamia"));
ck("6 shared 'both' toxins appear for each species", catList.some((t) => t.slug === "chocolate") && dogList.some((t) => t.slug === "chocolate"));

// ── 7. Free-text scanning (used by treat audit / meal planner / triage) ──────
const found = findToxinsInText("Today my dog ate some grapes and a bit of chocolate", "dog");
ck("7 scans free text for multiple toxins", found.some((t) => t.slug === "grapes-raisins") && found.some((t) => t.slug === "chocolate"));
ck("7 onion is caught for a cat", findToxinsInText("a little onion soup", "cat").some((t) => t.slug === "allium"));

// ── 8. Absence is NEVER safety ───────────────────────────────────────────────
ck("8 an unknown item returns no matches", searchToxins("unicorn sparkle dust").length === 0);
ck("8 not-found copy explicitly says it does NOT mean safe", /not\s+(on this list|found)/i.test(NOT_FOUND_NOT_SAFE) && /safe/i.test(NOT_FOUND_NOT_SAFE));

// ── 9. Review status / pending-vet-review accounting ─────────────────────────
ck("9 pendingVetReview lists entries not yet vet-verified", pendingVetReview().length === TOXINS.filter((t) => t.reviewStatus !== "vet_reviewed").length);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
