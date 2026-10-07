/**
 * Graded product catalogue + product safety rules.
 *
 * These products are commercial supplements shown to owners inside a health
 * app, so the tests here are about what the app is allowed to SAY, not about
 * rendering: that an "avoid" product can never be presented as a pick, that a
 * cat is never offered a tea-tree product, that a blocked male cat gets an
 * emergency instead of a shopping list, and that every claim carries its grade.
 *
 * Run: bun tests/products.test.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { CONDITION_AILMENTS, MAPPED_AILMENTS, UNMAPPED_AILMENTS } from "../lib/protocols/ailmentMap";
import {
  CATALOG_PULLED,
  GRADED_PRODUCTS,
  KITS,
  PRODUCTS_BY_ID,
  productsForAilment,
  type GradedProduct,
} from "../lib/protocols/productCatalog";
import { productsForCondition, PRODUCT_LIST_CAVEAT } from "../lib/protocols/productPicks";
import {
  ACTION_LABEL,
  checkProductSafety,
  GRADE_MEANING,
  PRODUCT_SAFETY_RULES,
  strictestAction,
  type PetSafetyContext,
} from "../lib/protocols/productSafety";
import { CONDITION_TEMPLATES } from "../lib/integrative/conditions";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

const ROOT = join(fileURLToPath(new URL(".", import.meta.url).href), "..");
const src = (rel: string): string => readFileSync(join(ROOT, rel), "utf8");

const dog = (over: Partial<PetSafetyContext> = {}): PetSafetyContext => ({
  name: "Scout",
  species: "dog",
  sex: "female",
  ageYears: 5,
  conditions: [],
  ...over,
});
const cat = (over: Partial<PetSafetyContext> = {}): PetSafetyContext => ({
  name: "Willow",
  species: "cat",
  sex: "female",
  ageYears: 7,
  conditions: [],
  ...over,
});
const facts = (p: GradedProduct) => ({
  name: p.name,
  safetyRuleIds: p.safetyRuleIds,
  ailments: p.ailments,
  species: p.species,
});

// ── 1. The catalogue matches the research it came from ───────────────────────
const research = GRADED_PRODUCTS.filter((p) => p.store !== "standardprocess.com");
const standardProcess = GRADED_PRODUCTS.filter((p) => p.store === "standardprocess.com");
ck("1 all 60 researched products are present", research.length === 60, `${research.length}`);
ck("1 the Standard Process line is graded alongside them", standardProcess.length === 12);
ck("1 every Standard Process product is vet-gated (Patient Direct is practitioner-only)", standardProcess.every((p) => p.action === "vet_only"));
ck("1 none is scored above C despite the owner's practitioner account", standardProcess.every((p) => p.grade === "C"));
ck("1 a product with no public price says so rather than showing zero", standardProcess.every((p) => p.priceUsd === null) && /price via your vet/.test(src("components/ProductPicks.tsx")));
const grades = research.reduce<Record<string, number>>((a, p) => ({ ...a, [p.grade]: (a[p.grade] ?? 0) + 1 }), {});
ck("1 grade split matches the source (4 A, 7 B, 31 C, 18 D)", grades.A === 4 && grades.B === 7 && grades.C === 31 && grades.D === 18, JSON.stringify(grades));
const actions = research.reduce<Record<string, number>>((a, p) => ({ ...a, [p.action]: (a[p.action] ?? 0) + 1 }), {});
ck("1 action split matches the source", actions.recommend === 23 && actions.caution === 13 && actions.info_only === 14 && actions.vet_only === 7 && actions.avoid === 3, JSON.stringify(actions));
ck("1 ids are unique", new Set(GRADED_PRODUCTS.map((p) => p.id)).size === GRADED_PRODUCTS.length);
ck("1 every product has a real summary", GRADED_PRODUCTS.every((p) => p.summary.trim().length > 50));
ck("1 every product links to its source page", GRADED_PRODUCTS.every((p) => /^https:\/\//.test(p.url)));
ck("1 the pull date is recorded so prices can be aged", /^\d{4}-\d{2}-\d{2}$/.test(CATALOG_PULLED));
ck("1 every rule id used by a product exists", GRADED_PRODUCTS.every((p) => p.safetyRuleIds.every((id) => PRODUCT_SAFETY_RULES.some((r) => r.id === id))));
const jointByGrade = productsForAilment("joint");
ck("1 products for an ailment come back strongest-evidence-first", jointByGrade.length > 0 && jointByGrade[0].grade === "A");

// ── 1b. One product model, not two ──────────────────────────────────────────
// Regression: the Standard Process rows were seeded a month before the grading
// system existed, so they sat in the marketplace ungraded, never appeared in a
// protocol, and no safety rule ever looked at them.
ck("1b Standard Process products carry ailment tags so they reach protocols", standardProcess.every((p) => p.ailments.length > 0));
ck("1b the kidney protocol now offers the practitioner-channel option too",
  productsForCondition("kidney_hydration", dog()).picks.some((x) => x.product.id === "sp-canine-renal"));
ck("1b the feline immune product exists even though immune has no protocol yet",
  GRADED_PRODUCTS.some((p) => p.id === "sp-feline-immune" && p.ailments.includes("immune")));
ck("1b the SP omega-3 carries the same fish-oil rule as every other fish oil",
  PRODUCTS_BY_ID.get("sp-vf-omega3")!.safetyRuleIds.includes(8));

// ── 2. Copy rules: our words, our claims ─────────────────────────────────────
// The research doc is explicit that store copy is copyrighted AND makes disease
// claims. These are the claims this app does not make, in any summary.
const BANNED = [/\bcures?\b/i, /\bheals?\b/i, /\bprevents?\b/i, /\btreats\b/i, /\bcleanest\b/i, /\bsafest\b/i, /\bpurest\b/i, /\bmiracle\b/i, /\bguaranteed\b/i];
// A claim is only a claim when it isn't negated: "no good evidence of benefit"
// is the opposite of a cure claim, and the scan must not punish saying so.
const NEGATED = /\b(no|not|never|isn'?t|doesn'?t|without|rather than|instead of)\b[^.]{0,60}$/i;
const offenders = GRADED_PRODUCTS.filter((p) =>
  BANNED.some((re) => {
    const m = re.exec(p.summary);
    return m && !NEGATED.test(p.summary.slice(0, m.index));
  }),
);
ck("2 no summary claims a product cures, heals, prevents or treats", offenders.length === 0, offenders.map((p) => p.id).join(", "));
ck("2 no summary promises a detox", !GRADED_PRODUCTS.some((p) => /\bdetoxif/i.test(p.summary)));
// Honesty the other way: where there is no evidence, the summary says so.
const dGrade = GRADED_PRODUCTS.filter((p) => p.grade === "D");
const dSaysSo = dGrade.filter((p) => /no (pet )?(trials|studies)|unstudied|traditional use|barely studied|no good evidence|no evidence|doesn't recommend|homeopathic|no defined outcome|not shown|have not been shown/i.test(p.summary));
ck("2 every grade-D product says plainly that the evidence isn't there", dSaysSo.length === dGrade.length, `${dSaysSo.length}/${dGrade.length}`);
ck("2 each grade is explained in plain language", Object.values(GRADE_MEANING).every((m) => m.length > 20));
ck("2 the standing caveat says Petwell earns nothing from the choice", /earn nothing/i.test(PRODUCT_LIST_CAVEAT));

// ── 3. The ten safety rules exist and are specific ───────────────────────────
ck("3 all ten rules from the research doc are implemented", PRODUCT_SAFETY_RULES.length === 10 && PRODUCT_SAFETY_RULES.every((r, i) => r.id === i + 1));
ck("3 every rule cites its basis", PRODUCT_SAFETY_RULES.every((r) => r.basis.length > 20));
ck("3 no rule copy gives a dose", !PRODUCT_SAFETY_RULES.some((r) => /\b\d+\s?(mg|ml|iu|mcg)\b/i.test(r.copy(dog()))));
ck("3 the strictest action wins when two disagree", strictestAction("recommend", "avoid") === "avoid" && strictestAction("caution", "vet_only") === "vet_only" && strictestAction("recommend", "info_only") === "info_only");

// ── 4. Rule 6: the blocked male cat is an emergency, not a shopping trip ─────
const easyPeesy = PRODUCTS_BY_ID.get("ab-easy-peesy-ii")!;
const blockedCat = cat({ sex: "male", currentSigns: ["straining in the litter box, no urine"] });
const blocked = checkProductSafety(facts(easyPeesy), easyPeesy.action, blockedCat);
ck("4 a straining male cat triggers the emergency rule", blocked.emergency === true);
ck("4 the emergency copy says go now, and names the risk", /now/i.test(blocked.emergencyCopy ?? "") && /emergency|life-threatening/i.test(blocked.emergencyCopy ?? ""));
ck("4 the emergency copy tells them NOT to use a supplement instead", /do not give a urinary supplement/i.test(blocked.emergencyCopy ?? ""));
ck("4 the product is blocked outright during the emergency", blocked.action === "avoid");
// Urinary products aren't on a protocol yet (see UNMAPPED_AILMENTS), so the
// place an owner meets them is the marketplace — which must run the same rules.
const marketSrc = src("app/marketplace.tsx");
ck("4 the marketplace runs the product safety rules too", /checkProductSafety/.test(marketSrc));
ck("4 an emergency replaces the marketplace shelf with the warning", /emergencyBanner/.test(marketSrc) && /verdict\.emergency/.test(marketSrc));
ck("4 the marketplace drops anything the rules call 'avoid' for this pet", /verdict\.action !== "avoid"/.test(marketSrc));
ck("4 protocol picks are emptied when an emergency fires", /if \(emergency\) return \{ picks: \[\], notRecommended: \[\], emergency \}/.test(src("lib/protocols/productPicks.ts")));
// A female cat with the same signs still needs a vet, but rule 6 is specific.
const femaleStraining = checkProductSafety(facts(easyPeesy), easyPeesy.action, cat({ currentSigns: ["straining"] }));
ck("4 rule 6 is specific to male cats (it is an obstruction rule)", femaleStraining.emergency === false);
ck("4 a calm male cat doesn't trigger it", checkProductSafety(facts(easyPeesy), easyPeesy.action, cat({ sex: "male" })).emergency === false);

// ── 5. Rule 4: essential oils and cats ───────────────────────────────────────
const dentalDrops = PRODUCTS_BY_ID.get("drjudy-dental-formula")!;
const catDental = checkProductSafety(facts(dentalDrops), dentalDrops.action, cat());
ck("5 an essential-oil product is blocked for a cat", catDental.action === "avoid");
ck("5 the reason names the cat's metabolism, not just 'unsafe'", /can't break these down|metaboli/i.test(catDental.notes.map((n) => n.copy).join(" ")));
const dogDental = checkProductSafety(facts(dentalDrops), dentalDrops.action, dog());
ck("5 the same product is allowed for a dog", dogDental.action !== "avoid");
ck("5 but the dog is warned about the cat in the house", /keep it away from any cat/i.test(dogDental.notes.map((n) => n.copy).join(" ")));
const shampoo = PRODUCTS_BY_ID.get("kinkind-itchy-shampoo")!;
ck("5 the tea-tree shampoo is blocked for cats even though it is tagged dog-only", checkProductSafety(facts(shampoo), shampoo.action, cat()).action === "avoid");

// ── 6. Rule 1: greater celandine and the liver ───────────────────────────────
const liverTonic = PRODUCTS_BY_ID.get("ab-liver-tonic")!;
const healthyDog = checkProductSafety(facts(liverTonic), liverTonic.action, dog());
const liverDog = checkProductSafety(facts(liverTonic), liverTonic.action, dog({ conditions: ["elevated liver enzymes"] }));
ck("6 greater celandine always carries its warning", healthyDog.notes.some((n) => n.ruleId === 1));
ck("6 a pet with liver disease is told to skip it by name", /skip this one/i.test(liverDog.notes.find((n) => n.ruleId === 1)?.copy ?? ""));
ck("6 the warning cites the case-report basis", /hepatotox/i.test(liverDog.notes.find((n) => n.ruleId === 1)?.basis ?? ""));
ck("6 barberry's prescription-interaction warning also fires", healthyDog.notes.some((n) => n.ruleId === 2));

// ── 6b. A rule may warn without restricting ─────────────────────────────────
// The split exists so the best-evidenced product isn't buried under a caveat
// that may not even apply to this pet, while the caveat is still always said.
ck("6b greater celandine is a caution normally, a block with liver disease on file",
  checkProductSafety(facts(liverTonic), liverTonic.action, dog()).action === "caution" &&
  checkProductSafety(facts(liverTonic), liverTonic.action, dog({ conditions: ["chronic hepatitis"] })).action === "avoid");
const fishHealthy = checkProductSafety(facts(PRODUCTS_BY_ID.get("ab-potent-sea-omega3")!), "recommend", dog());
ck("6b fish oil stays a recommendation for a pet with nothing on file", fishHealthy.action === "recommend");
ck("6b and still carries its NSAID/anticoagulant warning", fishHealthy.notes.some((n) => n.ruleId === 8));
ck("6b but is downgraded for a pet with pancreatitis",
  checkProductSafety(facts(PRODUCTS_BY_ID.get("ab-potent-sea-omega3")!), "recommend", dog({ conditions: ["pancreatitis"] })).action === "caution");

// ── 7. Rule 9: mushrooms are an adjunct, never a replacement ─────────────────
const turkeyTail = PRODUCTS_BY_ID.get("ab-turkey-tail")!;
const cancerDog = checkProductSafety(facts(turkeyTail), turkeyTail.action, dog({ conditions: ["splenic hemangiosarcoma"] }));
const note9 = cancerDog.notes.find((n) => n.ruleId === 9)?.copy ?? "";
ck("7 a cancer diagnosis gets the adjunct-only wording", /never a replacement|add-on/i.test(note9));
ck("7 it states the trial finding rather than hand-waving", /added no benefit|no added benefit|did worse|worse/i.test(note9));
ck("7 turkey tail is never action 'recommend'", GRADED_PRODUCTS.filter((p) => p.ailments.includes("cancer_support")).every((p) => p.action !== "recommend"));

// ── 8. Rules 7, 8, 10: spacing, bleeding, and human labels ───────────────────
const gutSoothe = PRODUCTS_BY_ID.get("ab-canine-gut-soothe")!;
ck("8 gut-coating powders warn about spacing from medication", /1–2 hours apart/i.test(checkProductSafety(facts(gutSoothe), gutSoothe.action, dog()).notes.map((n) => n.copy).join(" ")));
const fishOil = PRODUCTS_BY_ID.get("ab-potent-sea-omega3")!;
const pancreasDog = checkProductSafety(facts(fishOil), fishOil.action, dog({ conditions: ["history of pancreatitis"] }));
ck("8 fish oil names pancreatitis when the pet has it on file", /pancreatitis/i.test(pancreasDog.notes.find((n) => n.ruleId === 8)?.copy ?? ""));
ck("8 fish oil still warns about NSAIDs for a pet with no conditions listed", /NSAID|blood thinner/i.test(checkProductSafety(facts(fishOil), fishOil.action, dog()).notes.find((n) => n.ruleId === 8)?.copy ?? ""));
const melatonin = PRODUCTS_BY_ID.get("now-melatonin-3mg")!;
ck("8 human products warn about xylitol by name", /xylitol/i.test(checkProductSafety(facts(melatonin), melatonin.action, dog()).notes.find((n) => n.ruleId === 10)?.copy ?? ""));
const humanProducts = GRADED_PRODUCTS.filter((p) => /^NOW Foods$/.test(p.brand));
ck("8 every human-label NOW product carries rule 10", humanProducts.length >= 4 && humanProducts.every((p) => p.safetyRuleIds.includes(10)), humanProducts.map((p) => p.id).join(", "));

// ── 9. "Avoid" can never become a recommendation ─────────────────────────────
const avoidProducts = GRADED_PRODUCTS.filter((p) => p.action === "avoid");
ck("9 the three not-recommended products are still catalogued", avoidProducts.length === 3);
ck("9 each explains why, in its own summary", avoidProducts.every((p) => /doesn't recommend/i.test(p.summary)));
for (const p of avoidProducts) {
  const v = checkProductSafety(facts(p), p.action, dog());
  ck(`9 ${p.id} stays 'avoid' after the rules run`, v.action === "avoid");
}
// Across every condition and both species, nothing tagged avoid reaches `picks`.
let leaked = 0;
for (const condition of Object.keys(CONDITION_AILMENTS)) {
  for (const ctx of [dog(), cat(), dog({ conditions: ["liver disease", "cancer"] })]) {
    const res = productsForCondition(condition, ctx);
    leaked += res.picks.filter((x) => x.action === "avoid" || x.product.action === "avoid").length;
  }
}
ck("9 no 'avoid' product reaches the picks list on any protocol, for any pet", leaked === 0);
ck("9 the marketplace ranking excludes them too", /appAction !== "avoid"/.test(src("lib/integrative/marketplace.ts")));
ck("9 but the marketplace still shows them with the reason", /notRecommendedIn/.test(src("app/marketplace.tsx")));
ck("9 every action has an owner-facing label", Object.keys(ACTION_LABEL).length === 5);

// ── 10. Species gating ───────────────────────────────────────────────────────
const catOnly = PRODUCTS_BY_ID.get("ab-felixs-flora")!;
ck("10 a cat-only product is blocked for a dog", checkProductSafety(facts(catOnly), catOnly.action, dog()).action === "avoid");
ck("10 the yard product isn't blocked on species (it isn't given to the pet)", checkProductSafety(facts(PRODUCTS_BY_ID.get("flea-destroyer-nematodes")!), "recommend", cat()).action !== "avoid");
for (const condition of Object.keys(CONDITION_AILMENTS)) {
  const catPicks = productsForCondition(condition, cat()).picks;
  const wrongSpecies = catPicks.filter((x) => x.product.species !== "environment" && !x.product.species.includes("cat"));
  ck(`10 ${condition}: a cat is never shown a dog-only product`, wrongSpecies.length === 0, wrongSpecies.map((x) => x.product.id).join(", "));
}

// ── 11. Kits are shown as parts, never as one grade ──────────────────────────
const kits = GRADED_PRODUCTS.filter((p) => p.isKit);
ck("11 every kit has its contents recorded", kits.length === 4 && kits.every((k) => !!KITS[k.id]));
ck("11 every component carries its own grade", Object.values(KITS).every((k) => k.components.every((c) => ["A", "B", "C", "D"].includes(c.grade))));
ck("11 components that are sold separately link to the catalogue entry", Object.values(KITS).every((k) => k.components.every((c) => c.productId === null || PRODUCTS_BY_ID.has(c.productId))));
ck("11 kits mix grades — which is the reason not to give one grade", Object.values(KITS).some((k) => new Set(k.components.map((c) => c.grade)).size > 1));
ck("11 the UI says each part is graded on its own", /graded on its own evidence/i.test(src("components/ProductPicks.tsx")));
ck("11 no kit is ever action 'recommend'", kits.every((k) => k.action !== "recommend"));

// ── 12. Protocol wiring ──────────────────────────────────────────────────────
const templateIds = new Set(CONDITION_TEMPLATES.map((t) => t.id));
ck("12 every mapped condition is a real protocol", Object.keys(CONDITION_AILMENTS).every((id) => templateIds.has(id)), Object.keys(CONDITION_AILMENTS).filter((id) => !templateIds.has(id)).join(", "));
const allAilments = new Set(GRADED_PRODUCTS.flatMap((p) => p.ailments));
const unmappedListed = new Set(UNMAPPED_AILMENTS.map((u) => u.ailment));
const unaccounted = [...allAilments].filter((a) => !MAPPED_AILMENTS.has(a) && !unmappedListed.has(a));
ck("12 every ailment is either mapped to a protocol or explicitly listed as unmapped", unaccounted.length === 0, unaccounted.join(", "));
ck("12 each unmapped ailment records why there's no protocol yet", UNMAPPED_AILMENTS.every((u) => u.why.length > 30));
const arthritisDog = productsForCondition("arthritis", dog());
ck("12 the arthritis protocol surfaces products", arthritisDog.picks.length > 0);
ck("12 the strongest evidence is offered first", arthritisDog.picks[0]?.product.grade === "A");
ck("12 picks are ordered by action then grade, not by price", arthritisDog.picks.every((p, i, a) => i === 0 || a[i - 1].action !== "recommend" || p.action !== "recommend" || a[i - 1].product.grade <= p.product.grade));
ck("12 an unknown condition returns nothing rather than guessing", productsForCondition("not_a_condition", dog()).picks.length === 0);
// Pancreatitis is the pancreas. Liver supplements do not belong on a low-fat
// pancreatitis plan, so that tag is unmapped rather than mapped to the nearest
// hepatic-system template.
ck("12 liver products are not offered on the pancreatitis protocol", productsForCondition("pancreatitis", dog()).picks.length === 0);
ck("12 and liver is recorded as needing its own protocol", UNMAPPED_AILMENTS.some((u) => u.ailment === "liver"));
ck("12 the protocol screen renders the product section", /ProductPicks/.test(src("app/protocol-detail.tsx")) && /productsForCondition/.test(src("app/protocol-detail.tsx")));
ck("12 the FTC disclosure renders with the product list", /AffiliateDisclosure/.test(src("components/ProductPicks.tsx")));

// ── 13. One safety gate, not two ─────────────────────────────────────────────
// Regression: buildPlan() used a weaker local copy of the contraindication
// rules, so a plan could suggest something the protocol screen withheld.
const engineSrc = src("lib/integrative/engine.ts");
ck("13 the plan engine uses the shared safety gate", /checkItemSafety\(item, pet\)/.test(engineSrc));
ck("13 the weaker duplicate is gone", !/function contraindicated/.test(engineSrc));
ck("13 the plan engine filters on the verdict", /verdict\.allowed/.test(engineSrc));

// ── 14. Nothing in the catalogue carries an unagreed affiliate link ──────────
const catalogSrc = src("lib/protocols/productCatalog.ts");
ck("14 no affiliate link is baked into the catalogue", !/affiliateUrl|tag=|ref=|aff_id/i.test(catalogSrc));
ck("14 price is labelled as of the pull date, not as live", /when checked/i.test(src("components/ProductPicks.tsx")));

// Every file in lib/protocols is pure — no network, no storage.
const protocolFiles = readdirSync(join(ROOT, "lib", "protocols"));
const networked = protocolFiles.filter((f) => /@\/lib\/supabase|from "@\/services|\bfetch\(/.test(src(join("lib", "protocols", f))));
ck("14 the product layer is pure and offline", networked.length === 0, networked.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
