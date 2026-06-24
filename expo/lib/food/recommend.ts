/**
 * Pet-personalized recommendation inputs. The allergy check is a deterministic
 * safety gate: if a product contains an ingredient the pet is allergic to, the
 * engine caps the recommendation regardless of how good the other scores are.
 */

import type { AllergyConflict, PetContext, ProductBundle, Reason, Severity } from "./types";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Words that don't identify the allergen itself (so "Chicken protein" → chicken,
// "Pollen (seasonal)" → pollen, which then won't false-match any ingredient).
const GENERIC = new Set([
  "protein",
  "meal",
  "seasonal",
  "sensitivity",
  "allergy",
  "based",
  "product",
  "products",
  "byproduct",
  "derivative",
  "derivatives",
  "free",
  "the",
]);

function allergenTokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2 && !GENERIC.has(t));
}

export function findAllergyConflicts(bundle: ProductBundle, pet: PetContext): AllergyConflict[] {
  const byIngredient = new Map<string, AllergyConflict>();
  const allergies = pet.allergies
    .map((a) => ({ raw: a, tokens: allergenTokens(a) }))
    .filter((a) => a.tokens.length > 0);

  for (const ing of bundle.ingredients) {
    const name = ing.name.toLowerCase();
    for (const a of allergies) {
      if (!a.tokens.some((t) => name.includes(t))) continue;
      const refined = /\b(fat|oil)\b/.test(name); // refined fats/oils carry little allergen protein
      const conflict: AllergyConflict = {
        allergen: cap(a.tokens[0]),
        ingredient: ing.name,
        severity: refined ? "medium" : "high",
        note: refined
          ? `Refined ${ing.name.toLowerCase()} usually carries little allergen protein, but worth noting.`
          : `${ing.name} matches ${pet.name}'s ${a.raw} sensitivity.`,
      };
      const existing = byIngredient.get(ing.name);
      if (!existing || (existing.severity === "medium" && conflict.severity === "high")) {
        byIngredient.set(ing.name, conflict);
      }
    }
  }
  return [...byIngredient.values()];
}

export function ingredientConcerns(
  bundle: ProductBundle
): { ingredient: string; message: string; severity: Severity }[] {
  const out: { ingredient: string; message: string; severity: Severity }[] = [];
  for (const ing of bundle.ingredients) {
    for (const f of ing.flags) {
      if (f.severity === "good") continue;
      out.push({ ingredient: ing.name, message: f.message, severity: f.severity });
    }
  }
  // worst first
  return out.sort((a, b) => (a.severity === "bad" ? -1 : 1) - (b.severity === "bad" ? -1 : 1));
}

/** Why each alternative is being suggested — data-backed, never a purity claim. */
export function alternativeReasons(bundle: ProductBundle, pet: PetContext): Reason[] {
  const reasons: Reason[] = [];
  if (findAllergyConflicts(bundle, pet).length === 0 && pet.allergies.length)
    reasons.push({ text: `Free of ${pet.name}'s known allergens`, severity: "good" });
  const first = bundle.ingredients.find((i) => i.position === 1);
  if (first && first.category === "protein" && !/by-product/i.test(first.name))
    reasons.push({ text: `Named protein first (${first.name})`, severity: "good" });
  if (bundle.recalls.length === 0) reasons.push({ text: "No recalls on record", severity: "good" });
  if (/meet the aafco/i.test(bundle.aafcoStatement ?? ""))
    reasons.push({ text: "AAFCO complete & balanced", severity: "good" });
  return reasons.slice(0, 3);
}
