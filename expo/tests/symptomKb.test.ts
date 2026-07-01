/**
 * Symptom knowledge-base safety tests. The KB provides descriptive, source-backed
 * CONTEXT — never a diagnosis, treatment, or purity claim — and every entry stays
 * pending vet review. Observed red flags map to emergency urgency; the matcher is
 * area/species-scoped and returns nothing for unrelated observations.
 *
 * Run: bun tests/symptomKb.test.ts
 */
import { SYMPTOM_KB } from "../lib/symptomKb/data";
import { matchSymptomKb, topUrgency } from "../lib/symptomKb/match";
import { URGENCY_RANK } from "../lib/symptomKb/types";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

// ── 1. Every entry is well-formed + carries provenance, pending vet review ───
ck("1 seed is a meaningful library", SYMPTOM_KB.length >= 40);
ck("1 unique ids", new Set(SYMPTOM_KB.map((e) => e.id)).size === SYMPTOM_KB.length);
ck("1 every entry cites a source", SYMPTOM_KB.every((e) => !!e.source?.name));
ck("1 every entry has match tokens + related concern", SYMPTOM_KB.every((e) => e.matchTokens.length > 0 && !!e.relatedConcern));
ck("1 every entry is needs_vet_review (nothing auto-trusted)", SYMPTOM_KB.every((e) => e.reviewStatus === "needs_vet_review"));
ck("1 covers all five areas", new Set(SYMPTOM_KB.map((e) => e.area)).size === 5);
ck("1 has species-specific + shared entries", SYMPTOM_KB.some((e) => e.species === "cat") && SYMPTOM_KB.some((e) => e.species === "both"));

// ── 2. No entry reads as a diagnosis / treatment / purity claim ──────────────
const DIAGNOSIS = /\b(your (dog|cat|pet) has|is suffering from|diagnos|definitely|certainly (a|an)|it'?s (definitely|certainly))\b/i;
const TREATMENT = /\b(give (him|her|them)|administer|prescribe|\d+\s?mg|\bdose\b|induce vomit)\b/i;
const PURITY = /\b(cleanest|purest|safest|verified clean)\b/i;
const allText = SYMPTOM_KB.map((e) => `${e.title} ${e.mayIndicate}`).join("  ");
ck("2 no diagnosis phrasing anywhere", !DIAGNOSIS.test(allText));
ck("2 no treatment/dosing anywhere", !TREATMENT.test(allText));
ck("2 no purity/clean claim anywhere", !PURITY.test(allText));

// ── 3. Language is hedged and defers ─────────────────────────────────────────
// Every entry either hedges ("can be associated with…") OR defers to a vet /
// flags an emergency — it never states a plain fact as a certainty.
const HEDGE = /\b(can be associated|may|worth|should|is recommended|vet|emergency|right away|prompt)\b/i;
ck("3 every mayIndicate hedges or defers to a vet", SYMPTOM_KB.every((e) => HEDGE.test(e.mayIndicate)));

// ── 4. Observed red flags map to emergency urgency ───────────────────────────
const melena = SYMPTOM_KB.find((e) => e.id === "poop-melena");
const paleGums = SYMPTOM_KB.find((e) => e.id === "gums-pale");
const blueGums = SYMPTOM_KB.find((e) => e.id === "gums-cyanosis");
ck("4 black/tarry stool => emergency", melena?.urgency === "emergency");
ck("4 pale/white gums => emergency", paleGums?.urgency === "emergency");
ck("4 blue/purple gums => emergency", blueGums?.urgency === "emergency");

// ── 5. Matcher is area/species-scoped, urgency-ordered, and precise ──────────
const poopBlack = matchSymptomKb({ area: "poop", species: "dog", observations: [{ feature: "color", value: "very dark, almost black and tarry" }] });
ck("5 black tarry stool matches melena", poopBlack.some((e) => e.id === "poop-melena"));
ck("5 most-urgent match first", poopBlack.length > 0 && poopBlack[0].urgency === "emergency");
ck("5 same tokens in the WRONG area return nothing", matchSymptomKb({ area: "eye", species: "dog", observations: [{ feature: "x", value: "black tarry" }] }).length === 0);
ck("5 unrelated observation returns nothing", matchSymptomKb({ area: "poop", species: "cat", observations: [{ feature: "x", value: "normal formed brown" }] }).length === 0);
ck("5 cat matches 'both' entries", matchSymptomKb({ area: "teeth", species: "cat", observations: [{ feature: "gums", value: "pale white" }] }).some((e) => e.id === "gums-pale"));
ck("5 cat-specific entry matches a cat", matchSymptomKb({ area: "ear", species: "cat", observations: [{ feature: "debris", value: "dry dark coffee-ground debris" }] }).some((e) => e.id === "ear-mites-cat"));
ck("5 cat-specific entry does NOT match a dog", !matchSymptomKb({ area: "ear", species: "dog", observations: [{ feature: "debris", value: "dry dark coffee-ground debris" }] }).some((e) => e.id === "ear-mites-cat"));
ck("5 summary text is also matched", matchSymptomKb({ area: "eye", species: "dog", observations: [], summary: "thick green discharge from the eye" }).some((e) => e.id === "eye-discharge"));
ck("5 results are capped", matchSymptomKb({ area: "poop", species: "dog", observations: [{ feature: "x", value: "black tarry blood watery worm pale" }] }).length <= 4);

// ── 6. topUrgency helper ─────────────────────────────────────────────────────
ck("6 topUrgency of no matches is null", topUrgency([]) === null);
ck("6 topUrgency picks the most urgent", topUrgency(poopBlack) === "emergency");
ck("6 urgency ranks are ordered", URGENCY_RANK.emergency > URGENCY_RANK.vet_soon && URGENCY_RANK.vet_soon > URGENCY_RANK.watch);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
