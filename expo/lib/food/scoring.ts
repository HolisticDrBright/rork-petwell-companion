/**
 * The food scoring engine. Six sub-scores, each 0–100 (higher = better/safer).
 * Every score is deterministic and explainable.
 *
 * The contaminant-confidence score is the safety-critical one: it reflects the
 * strength of EVIDENCE (lab reports / recalls), never the photo. With no lab
 * evidence it stays low and says "No public lab test found". Demo/seed lab data
 * is treated as illustrative only and can never read as verified purity.
 */

import { countsAsProductLevelPurity, isProductSpecificResult } from "./provenance";
import type {
  LifeStage,
  PetContext,
  PetFoodHistory,
  ProductBundle,
  Reason,
  Severity,
  SubScore,
} from "./types";

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

function isSenior(pet: PetContext): boolean {
  return pet.species === "cat" ? pet.ageYears >= 11 : pet.ageYears >= 8;
}
function isYoung(pet: PetContext): boolean {
  return pet.ageYears < 1;
}

export function yearsBetween(dateIso: string | null, nowIso: string): number {
  if (!dateIso) return 99;
  const d = Date.parse(dateIso);
  const now = Date.parse(nowIso);
  if (Number.isNaN(d) || Number.isNaN(now)) return 99;
  return (now - d) / (365 * 24 * 3600 * 1000);
}

export function lifeStageFit(
  stage: LifeStage | null,
  pet: PetContext
): { fit: Severity; text: string } {
  const young = isYoung(pet);
  const senior = isSenior(pet);
  if (!stage || stage === "all") return { fit: "good", text: "Labeled for all life stages." };
  if (young && !(stage === "puppy" || stage === "kitten")) {
    if (stage === "senior")
      return { fit: "bad", text: "A senior formula for a young pet — not built for growth." };
    return { fit: "watch", text: "Not a growth formula — young pets usually need a puppy/kitten diet." };
  }
  if (senior && stage === "puppy")
    return { fit: "bad", text: "A puppy growth formula for a senior — usually too calorie/nutrient dense." };
  if ((stage === "puppy" || stage === "kitten") && !young)
    return { fit: "watch", text: "A growth formula for an adult — richer than typically needed." };
  if (stage === "senior" && !senior)
    return { fit: "watch", text: "A senior formula for a non-senior — generally fine, just lower calorie." };
  return { fit: "good", text: `Matches this pet's life stage (${stage}).` };
}

export function aafcoFit(bundle: ProductBundle): { fit: Severity; text: string } {
  const a = bundle.aafcoStatement ?? "";
  if (/meet the aafco/i.test(a))
    return { fit: "good", text: a };
  if (bundle.productType !== "food")
    return {
      fit: "watch",
      text: a || "Treat/supplement — intended for intermittent or supplemental feeding, not a complete diet.",
    };
  return { fit: "bad", text: "No AAFCO “complete and balanced” statement found on the label." };
}

export function scoreNutritionFit(bundle: ProductBundle, pet: PetContext): SubScore {
  let s = 65;
  const reasons: Reason[] = [];

  const aafco = aafcoFit(bundle);
  if (aafco.fit === "good") {
    s += 12;
    reasons.push({ text: "Meets an AAFCO nutrient profile (complete & balanced).", severity: "good" });
  } else if (aafco.fit === "bad") {
    s -= 12;
    reasons.push({ text: aafco.text, severity: "watch" });
  } else {
    reasons.push({ text: "For intermittent/supplemental feeding — not a complete diet.", severity: "watch" });
  }

  const lf = lifeStageFit(bundle.lifeStage, pet);
  if (lf.fit === "good") s += 8;
  else if (lf.fit === "bad") {
    s -= 15;
    reasons.push({ text: lf.text, severity: "bad" });
  } else reasons.push({ text: lf.text, severity: "watch" });

  const protein = bundle.nutrition?.proteinPct ?? null;
  if (protein != null && bundle.productType === "food") {
    const min = pet.species === "cat" ? 26 : isYoung(pet) ? 22 : 18;
    if (protein >= min) s += 5;
    else {
      s -= 10;
      reasons.push({ text: `Protein ${protein}% is below the ~${min}% typical for this pet.`, severity: "watch" });
    }
  }

  const conds = pet.conditions.join(" ").toLowerCase();
  if (/kidney|renal/.test(conds) && protein != null && protein > 30 && !/renal/i.test(bundle.name)) {
    s -= 12;
    reasons.push({
      text: "Higher protein may not suit a pet with kidney concerns — confirm with your vet.",
      severity: "watch",
    });
  }
  if ((pet.calorieConcern || /(over ?weight|obes)/.test(conds)) && bundle.calorieDensity === "calorie-dense") {
    s -= 8;
    reasons.push({ text: "Calorie-dense for a weight-management pet — portion carefully.", severity: "watch" });
  }

  if (reasons.every((r) => r.severity === "good") || reasons.length === 0)
    reasons.unshift({ text: "Nutrient basics line up for this pet.", severity: "good" });
  return { key: "nutrition_fit", label: "Nutrition fit", score: clamp(s), reasons };
}

export function scoreIngredientQuality(bundle: ProductBundle): SubScore {
  let s = 78;
  const reasons: Reason[] = [];
  const ings = bundle.ingredients;

  if (ings.length === 0) {
    return {
      key: "ingredient_quality",
      label: "Ingredient quality",
      score: 50,
      reasons: [{ text: "No ingredient list available to assess.", severity: "watch" }],
    };
  }

  const first = ings.find((i) => i.position === 1) ?? ings[0];
  if (first) {
    if (first.category === "protein" && !/by-product/i.test(first.name)) {
      s += 6;
      reasons.push({ text: `Named protein listed first (${first.name}).`, severity: "good" });
    } else if (/by-product/i.test(first.name)) {
      s -= 8;
      reasons.push({ text: `First ingredient is a by-product meal (${first.name}).`, severity: "watch" });
    }
  }

  for (const i of ings) {
    for (const f of i.flags) {
      if (f.severity === "good") s += 2;
      else if (f.severity === "watch") s -= 5;
      else s -= 11;
      if (f.severity !== "good") reasons.push({ text: `${i.name}: ${f.message}`, severity: f.severity });
    }
  }

  const goodCount = ings.filter((i) => i.flags.some((f) => f.severity === "good")).length;
  if (goodCount && !reasons.some((r) => r.severity === "good"))
    reasons.unshift({ text: `${goodCount} quality ingredient${goodCount > 1 ? "s" : ""} recognized.`, severity: "good" });

  return { key: "ingredient_quality", label: "Ingredient quality", score: clamp(s), reasons };
}

/**
 * SAFETY-CRITICAL. Confidence that the product is free of contaminants can come
 * ONLY from evidence (lab reports / recalls), never from a photo. States:
 *  - no tests  → ~25, "No public lab test found · purity confidence is limited"
 *  - demo-only pass tests → ~55, clearly flagged as illustrative, not verified
 *  - real pass tests → higher
 *  - any elevated/fail → pushed down hard
 */
export function scoreContaminantConfidence(bundle: ProductBundle): SubScore {
  const tests = bundle.labTests;
  const reasons: Reason[] = [];

  if (tests.length === 0) {
    return {
      key: "contaminant_confidence",
      label: "Contaminant confidence",
      score: 25,
      reasons: [{ text: "No public lab test found for this product.", severity: "watch" }],
      note: "A photo can't detect heavy metals, microplastics, pesticides, or plasticizers. No public lab test found — purity confidence is limited.",
    };
  }

  const realTests = tests.filter((t) => !t.isDemo);
  // A hard floor applies ONLY to a result specific to this product/lot. A brand-
  // or study-level elevated finding (e.g. a category average) is never presented
  // as a this-product failure — that would imply an exact-product result we don't
  // have, the same way a brand-level recall is never an exact-product recall.
  const flagged = tests.filter((t) => (t.status === "elevated" || t.status === "fail") && isProductSpecificResult(t.level));
  let score: number;

  if (flagged.length > 0) {
    score = 30;
    for (const t of flagged) reasons.push({ text: `${t.substance}: ${t.result}`, severity: "bad" });
  } else {
    // Only an independent, current, PRODUCT-level passing test earns high
    // confidence. Brand-, study-, or batch-level (or unverified-status) passing
    // evidence is real but caps at "moderate" (55) — never product-level purity.
    const productPass = tests.some(countsAsProductLevelPurity);
    score = productPass ? 85 : 55;
    for (const t of tests.filter((t) => t.status === "pass" && isProductSpecificResult(t.level)).slice(0, 4))
      reasons.push({ text: `${t.substance}: ${t.result}`, severity: "good" });
  }

  const demoOnly = realTests.length === 0;
  const productEvidence = tests.some(countsAsProductLevelPurity);
  const note = demoOnly
    ? "Based on Petwell demo/seed lab data — illustrative only, NOT real testing. Verified purity requires real lab reports."
    : productEvidence
      ? "Based on product-level lab reports. A photo alone can't establish purity."
      : "Based on brand- or study-level evidence only — not specific to this product/lot. A photo alone can't establish purity.";

  return { key: "contaminant_confidence", label: "Contaminant confidence", score: clamp(score), reasons, note };
}

export function scoreBrandTransparency(bundle: ProductBundle): SubScore {
  const b = bundle.brand;
  if (!b) {
    return {
      key: "brand_transparency",
      label: "Brand transparency",
      score: 45,
      reasons: [{ text: "No manufacturer information available.", severity: "watch" }],
      note: "Limited brand disclosure.",
    };
  }
  const s = b.transparencyScore ?? 50;
  const reasons: Reason[] = [];
  if (b.ownsFacilities) reasons.push({ text: "Manufacturer owns its facilities.", severity: "good" });
  else reasons.push({ text: "Co-manufactured / contract-made.", severity: "watch" });
  if (b.recallCount > 1)
    reasons.push({ text: `${b.recallCount} recalls on record for this brand.`, severity: "watch" });
  if (b.notes) reasons.push({ text: b.notes, severity: s >= 75 ? "good" : "watch" });
  return { key: "brand_transparency", label: "Brand transparency", score: clamp(s), reasons };
}

export function scoreRecallRisk(bundle: ProductBundle, nowIso: string): SubScore {
  let s = 100;
  const reasons: Reason[] = [];
  const recalls = bundle.recalls;

  if (recalls.length === 0) {
    reasons.push({ text: "No recalls found for this product or brand.", severity: "good" });
  }
  for (const r of recalls) {
    const recent = yearsBetween(r.recallDate, nowIso) <= 2;
    if (r.severity === "bad") {
      s -= recent ? 45 : 18;
      reasons.push({ text: `${r.reason}${recent ? " (recent)" : ""}`, severity: "bad" });
    } else if (r.severity === "watch") {
      s -= recent ? 22 : 10;
      reasons.push({ text: r.reason, severity: "watch" });
    } else {
      s -= 5;
      reasons.push({ text: r.reason, severity: "watch" });
    }
  }
  if (bundle.brand && bundle.brand.recallCount > 1) s -= 5;
  return { key: "recall_risk", label: "Recall risk", score: clamp(s), reasons };
}

export function scorePersonalOutcome(history: PetFoodHistory | undefined, pet: PetContext): SubScore {
  if (!history || history.priorFeedings === 0) {
    return {
      key: "personal_outcome",
      label: "Personal outcome",
      score: 60,
      reasons: [{ text: `No feeding history for ${pet.name} with this product yet.`, severity: "watch" }],
      note: "Personalize this by logging feeds and any symptoms that follow.",
    };
  }
  let s = 70;
  const reasons: Reason[] = [];
  if (history.adverseEvents > 0) {
    s -= 12 * history.adverseEvents;
    reasons.push({
      text: `${history.adverseEvents} symptom log${history.adverseEvents > 1 ? "s" : ""} recorded after feeding this.`,
      severity: "bad",
    });
  } else {
    s += Math.min(20, history.priorFeedings * 2);
    reasons.push({
      text: `Fed ${history.priorFeedings}× with no adverse symptoms logged.`,
      severity: "good",
    });
  }
  return { key: "personal_outcome", label: "Personal outcome", score: clamp(s), reasons };
}
