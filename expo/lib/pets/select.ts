/**
 * Pure pet-selection helpers shared by PetProvider (and unit tests).
 *
 * Production no longer auto-seeds demo pets, so a brand-new user genuinely has
 * zero pets. These helpers must therefore tolerate an empty list and never
 * assume `pets[0]` exists — the active pet is `Pet | null`.
 */
import type { Pet } from "@/types/pet";

/**
 * Resolve the active pet from the list, or `null` when there are no pets.
 *
 * Prefers an exact id match, then a demo_key match (a persisted `selectedPetId`
 * may reference a demo pet by its mock key), then the first pet as a fallback.
 */
export function resolveSelectedPet(pets: Pet[], selectedPetId: string | null | undefined): Pet | null {
  if (pets.length === 0) return null;
  return (
    pets.find((p) => p.id === selectedPetId) ??
    pets.find((p) => p.demoKey === selectedPetId) ??
    pets[0]
  );
}

/** A pet is a demo/sample pet iff it carries a demo_key (Buddy / Luna / Milo). */
export function isDemoPet(pet: Pet | null | undefined): boolean {
  return !!pet?.demoKey;
}
