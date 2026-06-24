/**
 * Review orchestrator. Combines the six sub-scores into an overall 0–100 / A–F
 * and a recommendation, applying deterministic SAFETY GATES that can only make
 * the recommendation more cautious:
 *   - a high-severity allergy conflict → Avoid (regardless of other scores)
 *   - a recent severe recall          → Avoid
 *   - a medium allergy / bad life-stage fit → at most Use caution
 */

import { collectSources, puritySummary } from "./evidence";
import { alternativeReasons, findAllergyConflicts, ingredientConcerns } from "./recommend";
import {
  aafcoFit,
  lifeStageFit,
  scoreBrandTransparency,
  scoreContaminantConfidence,
  scoreIngredientQuality,
  scoreNutritionFit,
  scorePersonalOutcome,
  scoreRecallRisk,
  yearsBetween,
} from "./scoring";
import type {
  FoodReview,
  PetContext,
  PetFoodHistory,
  ProductBundle,
  Reason,
  Recommendation,
  SubScore,
} from "./types";

const WEIGHTS: Record<SubScore["key"], number> = {
  nutrition_fit: 0.22,
  ingredient_quality: 0.22,
  contaminant_confidence: 0.14,
  brand_transparency: 0.12,
  recall_risk: 0.18,
  personal_outcome: 0.12,
};

const REC_LABEL: Record<Recommendation, string> = {
  good_fit: "Good fit",
  use_caution: "Use caution",
  avoid: "Avoid for this pet",
};

export function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function dedupeReasons(rs: Reason[]): Reason[] {
  const seen = new Set<string>();
  const out: Reason[] = [];
  for (const r of rs) {
    if (seen.has(r.text)) continue;
    seen.add(r.text);
    out.push(r);
  }
  return out;
}

export interface ReviewInput {
  bundle: ProductBundle;
  pet: PetContext;
  history?: PetFoodHistory;
  nowIso: string;
}

export function buildReview({ bundle, pet, history, nowIso }: ReviewInput): FoodReview {
  const nutrition = scoreNutritionFit(bundle, pet);
  const ingredient = scoreIngredientQuality(bundle);
  const contaminant = scoreContaminantConfidence(bundle);
  const brand = scoreBrandTransparency(bundle);
  const recall = scoreRecallRisk(bundle, nowIso);
  const personal = scorePersonalOutcome(history, pet);
  const subScores: SubScore[] = [nutrition, ingredient, contaminant, brand, recall, personal];

  const weighted =
    nutrition.score * WEIGHTS.nutrition_fit +
    ingredient.score * WEIGHTS.ingredient_quality +
    contaminant.score * WEIGHTS.contaminant_confidence +
    brand.score * WEIGHTS.brand_transparency +
    recall.score * WEIGHTS.recall_risk +
    personal.score * WEIGHTS.personal_outcome;

  const allergyConflicts = findAllergyConflicts(bundle, pet);
  const lf = lifeStageFit(bundle.lifeStage, pet);
  const aafco = aafcoFit(bundle);
  const activeRecall = bundle.recalls.some(
    (r) => r.severity === "bad" && yearsBetween(r.recallDate, nowIso) <= 2
  );

  const highAllergy = allergyConflicts.some((c) => c.severity === "high");
  const medAllergy = allergyConflicts.some((c) => c.severity === "medium");

  let recommendation: Recommendation;
  let overall = Math.round(weighted);
  let reason: string;

  if (highAllergy) {
    recommendation = "avoid";
    overall = Math.min(overall, 38);
    const c = allergyConflicts.find((x) => x.severity === "high")!;
    reason = `Contains ${c.ingredient} — ${pet.name} is allergic to ${c.allergen}.`;
  } else if (activeRecall) {
    recommendation = "avoid";
    overall = Math.min(overall, 45);
    reason = "Under a recent safety recall — not recommended right now.";
  } else {
    let band: Recommendation = overall >= 75 ? "good_fit" : overall >= 55 ? "use_caution" : "avoid";
    if (band === "good_fit" && (medAllergy || lf.fit === "bad")) band = "use_caution";
    if (overall > 70 && (medAllergy || lf.fit === "bad")) overall = 70;
    recommendation = band;
    reason =
      band === "good_fit"
        ? `A good nutritional and safety match for ${pet.name}.`
        : band === "use_caution"
          ? `Reasonable, but feed carefully and watch ${pet.name}'s response.`
          : `Several concerns outweigh the benefits for ${pet.name}.`;
  }

  const why: Reason[] = [];
  if (recommendation === "avoid") why.push({ text: reason, severity: "bad" });
  for (const ss of subScores) for (const r of ss.reasons) if (r.severity !== "good") why.push(r);
  for (const ss of subScores) {
    const good = ss.reasons.find((r) => r.severity === "good");
    if (good) why.push(good);
  }

  return {
    productId: bundle.id,
    productName: bundle.name,
    overallScore: overall,
    grade: gradeFor(overall),
    recommendation,
    recommendationLabel: REC_LABEL[recommendation],
    reason,
    subScores,
    allergyConflicts,
    ingredientConcerns: ingredientConcerns(bundle),
    aafco: { fit: aafco.fit, text: aafco.text },
    lifeStageFit: { fit: lf.fit, text: lf.text },
    recallStatus: {
      status: activeRecall ? "active" : bundle.recalls.length ? "watch" : "none",
      text: activeRecall
        ? "Active or recent recall affecting this brand — review the details."
        : bundle.recalls.length
          ? "A past recall is on record for this brand — review the details."
          : "No recalls found for this product or brand.",
      recalls: bundle.recalls,
    },
    purity: puritySummary(bundle),
    brandTransparency: { score: brand.score, text: brand.reasons[0]?.text ?? "" },
    whyFactors: dedupeReasons(why).slice(0, 10),
    sources: collectSources(bundle),
  };
}

export interface AlternativeItem {
  productId: string;
  name: string;
  brand: string | null;
  grade: string;
  score: number;
  recommendation: Recommendation;
  reasons: Reason[];
}

/**
 * Rank catalog alternatives for this pet. Suggestions are filtered to exclude
 * the current product, anything we'd tell the pet to avoid, and any high-allergy
 * conflict — then ranked by overall score. Each carries DATA-BACKED reasons
 * (allergen-free, named protein, no recalls, AAFCO) — never a purity/"cleanest"
 * claim, which a photo can't support.
 */
export function pickAlternatives(
  currentId: string,
  candidates: { bundle: ProductBundle; review: FoodReview }[],
  pet: PetContext
): AlternativeItem[] {
  return candidates
    .filter((c) => c.bundle.id !== currentId)
    .filter((c) => c.review.recommendation !== "avoid")
    .filter((c) => c.review.allergyConflicts.every((a) => a.severity !== "high"))
    .sort((a, b) => b.review.overallScore - a.review.overallScore)
    .slice(0, 3)
    .map((c) => ({
      productId: c.bundle.id,
      name: c.bundle.name,
      brand: c.bundle.brand?.name ?? null,
      grade: c.review.grade,
      score: c.review.overallScore,
      recommendation: c.review.recommendation,
      reasons: alternativeReasons(c.bundle, pet),
    }));
}
