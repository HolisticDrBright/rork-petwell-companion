/**
 * Breed → nutrition-context matching (pure; tested in tests/data.test.ts).
 *
 * Rows come from the `breed_food_fit` reference table (WSAVA-sourced general
 * guidance, migration 0034). Matching is deliberately forgiving: profile
 * breed names carry qualifiers ("Poodle (Standard/Miniature/Toy)",
 * "Domestic Shorthair (cat)") and owners type things like "Labrador mix".
 * Guidance is breed-AWARE only — the UI must keep the "general guidance,
 * not individually vet-reviewed" label.
 */

export interface BreedFitRow {
  breed: string;
  species: "dog" | "cat";
  sizeClass: string | null;
  nutritionConsiderations: string | null;
  nutrientsToDiscuss: string | null;
  avoidMonitorNotes: string | null;
  preferredFoodTraits: string | null;
  cautionFlags: string | null;
  sourceUrl: string | null;
  notes: string | null;
}

export const BREED_FIT_GUIDANCE_LABEL =
  "WSAVA-sourced general guidance — not individually vet-reviewed. Body condition, life stage, and your vet drive the plan, never breed alone.";

/** Lowercase, strip parentheticals/punctuation and mix-words: "Labrador Retriever Mix" → "labrador retriever". */
export function normalizeBreed(input: string): string {
  return input
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(mixed|mix|cross|crossbreed)\b/g, " ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Find the best row for a pet's typed breed. Exact normalized match wins;
 * otherwise a row whose normalized name is contained in the input (handles
 * "labrador retriever mix") or vice versa ("poodle" ⊂ "poodle (standard…)").
 */
export function findBreedFit(rows: BreedFitRow[], breed: string, species: "dog" | "cat"): BreedFitRow | null {
  const needle = normalizeBreed(breed);
  if (needle.length < 3) return null;
  const candidates = rows.filter((r) => r.species === species);
  let best: BreedFitRow | null = null;
  let bestLen = 0;
  for (const row of candidates) {
    const rowName = normalizeBreed(row.breed);
    if (!rowName) continue;
    const exact = rowName === needle;
    const contains = needle.includes(rowName) || rowName.includes(needle);
    if (!exact && !contains) continue;
    // Prefer exact, then the longest row name (most specific match).
    const score = exact ? 1000 : rowName.length;
    if (score > bestLen) {
      best = row;
      bestLen = score;
    }
  }
  return best;
}
