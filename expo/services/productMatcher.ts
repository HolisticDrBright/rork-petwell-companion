import { classifyMatch, type MatchConfidence, type MatchSignals } from "@/lib/food/productMatch";

/**
 * Ties the pure match-confidence classifier to real label-vs-candidate data by
 * computing name similarity + ingredient overlap, then classifying.
 */

function tokenize(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
}

/** Jaccard-ish token overlap, 0–1. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

/** Fraction of label ingredients present in the candidate, 0–1. */
export function ingredientOverlap(labelIngredients: string[], candidateIngredients: string[]): number {
  if (labelIngredients.length === 0) return 0;
  const cand = new Set(candidateIngredients.map((i) => i.toLowerCase().trim()));
  let hits = 0;
  for (const ing of labelIngredients) if (cand.has(ing.toLowerCase().trim())) hits++;
  return hits / labelIngredients.length;
}

export const productMatcher = {
  confidenceFor(input: {
    exactBarcode?: boolean;
    userConfirmed?: boolean;
    adminConfirmed?: boolean;
    labelName?: string;
    candidateName?: string;
    labelIngredients?: string[];
    candidateIngredients?: string[];
  }): MatchConfidence {
    const signals: MatchSignals = {
      adminConfirmed: input.adminConfirmed,
      userConfirmed: input.userConfirmed,
      exactBarcode: input.exactBarcode,
      nameScore: input.labelName && input.candidateName ? nameSimilarity(input.labelName, input.candidateName) : 0,
      ingredientOverlap:
        input.labelIngredients && input.candidateIngredients
          ? ingredientOverlap(input.labelIngredients, input.candidateIngredients)
          : 0,
    };
    return classifyMatch(signals);
  },
};
