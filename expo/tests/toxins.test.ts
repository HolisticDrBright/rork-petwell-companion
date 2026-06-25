/**
 * Toxin database safety-critical tests (pure functions). Run from expo/:
 *   bun tests/toxins.test.ts
 *
 * Aligned to docs/superpowers/specs/2026-06-25-toxin-database-design.md:
 *  - dogs & cats only; per-species severity differs where appropriate
 *  - alias / lay-term matching; no-result never implies safety
 *  - high/emergency entries route to poison control
 *  - NO dosing / treatment / first-aid language in the data
 *  - full provenance (source, last-reviewed, review status) on every entry
 *  - treat audit blocks core toxins; environment toxins are present + flagged
 *  - the two poison-control hotline numbers are exactly correct
 */
import { auditTreat } from "../lib/integrative/treats";
import {
  EMERGENCY_CONTACTS,
  NOT_FOUND_NOT_SAFE,
  NO_TREATMENT_NOTE,
} from "../lib/toxins/contacts";
import { TOXINS } from "../lib/toxins/data";
import {
  buildEmergencyAction,
  getToxinSeverity,
  shouldRouteToPoisonControl,
  WHAT_NOT_TO_DO,
} from "../lib/toxins/safety";
import {
  getToxinBySlug,
  matchToxinsInText,
  pendingVetReview,
  searchToxins,
  toxinsForSpecies,
} from "../lib/toxins/search";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

const dog = (o: any = {}): any => ({
  id: "d",
  name: "Rex",
  species: "dog",
  breed: "Mix",
  ageYears: 4,
  sex: "male",
  weightLb: 40,
  photo: "",
  conditions: [],
  allergies: [],
  ...o,
});

// ── 1. Scope: ≥50 toxins, dog/cat only, valid severity vocabulary ────────────
ck("1 ships at least 50 highest-priority toxins", TOXINS.length >= 50, `count=${TOXINS.length}`);
const SCOPE_OK = new Set(["dog", "cat", "both"]);
ck("1 every entry speciesScope is dog/cat/both", TOXINS.every((t) => SCOPE_OK.has(t.speciesScope)));
const SEV_OK = new Set(["emergency", "high", "caution", "usually_safe", "unknown"]);
ck("1 per-species severities use the spec vocabulary", TOXINS.every((t) => SEV_OK.has(t.dogSeverity) && SEV_OK.has(t.catSeverity)));
ck("1 slugs are unique", new Set(TOXINS.map((t) => t.slug)).size === TOXINS.length);

// ── 2. Provenance on every entry ─────────────────────────────────────────────
const provOk = TOXINS.every(
  (t) =>
    !!t.source?.name &&
    !!t.source?.publisher &&
    /^https?:\/\//.test(t.source?.url ?? "") &&
    /^\d{4}-\d{2}-\d{2}$/.test(t.lastReviewed) &&
    ["source_cited", "vet_reviewed", "needs_review", "deprecated"].includes(t.evidenceStatus) &&
    t.clinicalSigns.length > 0 &&
    t.bodySystems.length > 0 &&
    t.summary.length > 0 &&
    t.commonSources.length > 0,
);
ck("2 every entry has source + ISO last-reviewed + status + signs + summary", provOk);
ck("2 seed entries are pending vet review (reviewedBy null)", TOXINS.every((t) => t.reviewedBy === null));

// ── 3. NO dosing / treatment / first-aid language in the data ────────────────
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
  const blob = `${t.name} ${t.summary} ${t.clinicalSigns.join(" ")} ${t.bodySystems.join(" ")} ${t.commonSources} ${t.doseWarning ?? ""}`.toLowerCase();
  for (const term of FORBIDDEN) if (blob.includes(term)) offenders.push(`${t.slug}:${term}`);
  if (/\bdose(s|d)?\b/.test(blob) || /\bgive\b/.test(blob)) offenders.push(`${t.slug}:dose/give`);
}
ck("3 no dosing/treatment/first-aid language in any entry", offenders.length === 0, offenders.join(", "));
ck("3 standing no-treatment note exists", /treatment|dose|first-aid/i.test(NO_TREATMENT_NOTE));

// ── 4. Emergency contacts: exact hotline numbers ─────────────────────────────
const aspca = EMERGENCY_CONTACTS.find((c) => c.id === "aspca_apcc");
const pph = EMERGENCY_CONTACTS.find((c) => c.id === "pet_poison_helpline");
ck("4 ASPCA APCC is 888-426-4435", !!aspca && aspca.display === "(888) 426-4435" && aspca.tel === "tel:+18884264435");
ck("4 Pet Poison Helpline is 855-764-7661", !!pph && pph.display === "(855) 764-7661" && pph.tel === "tel:+18557647661");

// ── 5. Per-species severity differs where appropriate (spec: lily, Tylenol) ──
const lily = getToxinBySlug("lily-true")!;
const tylenol = getToxinBySlug("acetaminophen")!;
ck("5 true lily is an emergency for cats, lower for dogs", getToxinSeverity(lily, "cat") === "emergency" && getToxinSeverity(lily, "dog") !== "emergency");
ck("5 acetaminophen is an emergency for cats, high for dogs", getToxinSeverity(tylenol, "cat") === "emergency" && getToxinSeverity(tylenol, "dog") === "high");

// ── 6. High/emergency entries route to poison control ────────────────────────
ck("6 emergency entry routes to poison control", shouldRouteToPoisonControl(tylenol, "cat") === true);
const aloe = getToxinBySlug("aloe")!;
ck("6 a 'caution' entry does not force poison-control routing", shouldRouteToPoisonControl(aloe, "dog") === false);
const action = buildEmergencyAction(tylenol, "cat");
ck("6 emergency action says call now + lists what NOT to do", /now/i.test(action.headline) && action.whatNotToDo.length > 0);
ck("6 'do not induce vomiting' is in the what-not-to-do copy", WHAT_NOT_TO_DO.some((w) => /induce vomiting/i.test(w)));

// ── 7. Alias / lay-term matching ─────────────────────────────────────────────
ck("7 finds by name", searchToxins("xylitol").some((t) => t.slug === "xylitol"));
ck("7 'gum sweetener' -> xylitol", searchToxins("gum sweetener").some((t) => t.slug === "xylitol"));
ck("7 'rat poison' -> a rodenticide", searchToxins("rat poison").some((t) => t.category === "household" && /rodenticide|bait/i.test(t.name + t.aliases.join())));
ck("7 'weed' -> cannabis", searchToxins("weed").some((t) => t.slug === "cannabis-thc"));
ck("7 'Tylenol' -> acetaminophen, 'Advil' -> ibuprofen", searchToxins("tylenol").some((t) => t.slug === "acetaminophen") && searchToxins("advil").some((t) => t.slug === "ibuprofen-nsaids"));
ck("7 getToxinBySlug returns by slug, undefined for unknown", !!getToxinBySlug("chocolate") && getToxinBySlug("nope") === undefined);

// ── 8. Free-text scanning (treat audit / meal planner / triage) ──────────────
const found = matchToxinsInText("my dog ate grapes and chocolate", "dog");
ck("8 scans free text for multiple toxins", found.some((t) => t.slug === "grapes-raisins") && found.some((t) => t.slug === "chocolate"));
ck("8 onion caught for a cat", matchToxinsInText("a little onion", "cat").some((t) => t.slug === "allium"));

// ── 9. Absence is NEVER safety ───────────────────────────────────────────────
ck("9 unknown item returns no matches", searchToxins("unicorn sparkle dust").length === 0);
ck("9 not-found copy says it does NOT mean safe", /not\s+(on this list|found)/i.test(NOT_FOUND_NOT_SAFE) && /safe/i.test(NOT_FOUND_NOT_SAFE));

// ── 10. Treat audit blocks the core toxins (uses derived TOXIC_FOODS) ─────────
const blocks = (ing: string) => auditTreat({ name: ing, ingredients: [ing] }, dog()).verdict === "avoid";
ck("10 treat audit blocks xylitol", blocks("xylitol"));
ck("10 treat audit blocks chocolate", blocks("chocolate"));
ck("10 treat audit blocks onion/garlic", blocks("onion"));
ck("10 treat audit blocks grapes/raisins", blocks("grapes"));

// ── 11. Environment-relevant toxins are present + flagged ────────────────────
const envSlugs = ["lily-true", "sago-palm", "antifreeze", "anticoagulant-rodenticide", "tea-tree-oil"];
const envOk = envSlugs.every((s) => {
  const t = getToxinBySlug(s);
  return !!t && (["emergency", "high"].includes(t.dogSeverity) || ["emergency", "high"].includes(t.catSeverity));
});
ck("11 environment toxins (lily, sago, antifreeze, rodenticide, oil) present + flagged", envOk);

// ── 12. Species scoping never hides relevant entries; pending-review accounting
ck("12 lily appears for both cats and dogs (scope=both, severity differs)", toxinsForSpecies("cat").some((t) => t.slug === "lily-true") && toxinsForSpecies("dog").some((t) => t.slug === "lily-true"));
ck("12 all seed entries are pending vet review", pendingVetReview().length === TOXINS.length);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
