import { TOXINS } from "@/lib/toxins/data";
import type { ToxinEntry } from "@/lib/toxins/types";

import type { CatalogItem, PetLite, SafetyLevel } from "./types";

/**
 * Petwell safety / contraindication engine.
 *
 * This is the MANDATORY gate every supplement/herb/food/treat recommendation
 * passes through. It is deterministic and offline-safe, and it is intentionally
 * CONSERVATIVE: when information is missing, it withholds the recommendation and
 * tells the owner to ask their vet rather than guessing.
 *
 * Copy rule: supportive language only. Nothing here "treats" or "cures".
 */

export const ASK_VET_FIRST_COPY =
  "Ask your vet before using this for your pet.";

/** Shown when we genuinely cannot vouch for safety (missing species/dose data). */
export const NOT_ENOUGH_INFO_COPY =
  "Petwell does not have enough safety information to recommend this for your pet. Ask your vet first.";

export type LifeStage = "puppy_kitten" | "adult" | "senior";

export function lifeStage(species: "dog" | "cat", ageYears: number): LifeStage {
  if (ageYears < 1) return "puppy_kitten";
  // Cats and small dogs are considered senior a little earlier in practice; we
  // use a simple, conservative cutoff.
  const seniorAt = species === "cat" ? 10 : 8;
  return ageYears >= seniorAt ? "senior" : "adult";
}

/**
 * Household / dietary toxins. These are absolute "never" items — they are not
 * recommendations the app would make, but the environment scanner, treat audit,
 * and meal planner check against them so the app never green-lights a hazard.
 */
export interface ToxinRef {
  name: string;
  /** match tokens (lowercased substrings) used to spot the toxin in free text */
  match: string[];
  species: "dog" | "cat" | "both";
  severity: "toxic" | "high" | "caution";
  note: string;
}

/** Collapse the per-species severities to the engine's 3-level scale. */
function worstSeverity(entry: ToxinEntry): ToxinRef["severity"] {
  const rank = { emergency: 4, high: 3, caution: 2, usually_safe: 1, unknown: 1 } as const;
  const worst = Math.max(rank[entry.dogSeverity], rank[entry.catSeverity]);
  return worst >= 4 ? "toxic" : worst === 3 ? "high" : "caution";
}

/** Bridge the rich local toxin entry to the engine's lightweight ToxinRef. */
function toToxinRef(entry: ToxinEntry): ToxinRef {
  return {
    name: entry.name,
    match: entry.aliases,
    species: entry.speciesScope,
    severity: worstSeverity(entry),
    note: entry.summary,
  };
}

// These three lists are now DERIVED from the canonical local toxin database
// (lib/toxins) so the treat audit, environment scanner, and meal planner all
// share one source of truth and stay in sync as the database grows.
export const TOXIC_FOODS: ToxinRef[] = TOXINS.filter((e) => e.category === "food").map(toToxinRef);

export const TOXIC_PLANTS: ToxinRef[] = TOXINS.filter((e) => e.category === "plant").map(toToxinRef);

/**
 * Essential oils. Cats lack the liver enzymes (glucuronidation) to process many
 * of these and can be harmed by skin contact or diffused vapor.
 */
export const RISKY_ESSENTIAL_OILS: ToxinRef[] = TOXINS.filter((e) => e.category === "essential_oil").map(
  toToxinRef,
);

const norm = (s: string) => s.toLowerCase();

/** Find any toxin (food/plant/oil) referenced in free text for a given species. */
export function findToxins(text: string, species: "dog" | "cat", refs: ToxinRef[]): ToxinRef[] {
  const t = norm(text);
  return refs.filter(
    (r) => (r.species === "both" || r.species === species) && r.match.some((m) => t.includes(m))
  );
}

const GENERIC_ALLERGY = new Set(["protein", "seasonal", "sensitivity", "allergy", "the", "and", "based"]);

/** Whole-word / prefix allergen match (avoids "oat" matching "goat"). */
export function allergyConflict(name: string, allergies: string[]): string | null {
  const words = norm(name).split(/[^a-z]+/).filter(Boolean);
  for (const a of allergies) {
    const tokens = norm(a)
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !GENERIC_ALLERGY.has(t));
    if (tokens.length === 0) continue;
    if (tokens.some((t) => words.some((w) => w === t || w.startsWith(t)))) return a;
  }
  return null;
}

/** Does a catalog item's listed contraindication match one of the pet's conditions? */
export function conditionConflict(item: CatalogItem, pet: PetLite): string | null {
  const conditions = pet.conditions.map(norm);
  for (const c of item.contraindications) {
    const key = norm(c);
    const hit = conditions.some((pc) =>
      pc.split(/[^a-z]+/).some((w) => w.length > 3 && key.includes(w))
    );
    if (hit) return c;
  }
  return null;
}

export interface SafetyVerdict {
  /** false → do not surface this as a recommendation at all */
  allowed: boolean;
  /** true → surface only with a prominent "ask your vet first" flag */
  askVetFirst: boolean;
  level: SafetyLevel;
  reasons: string[];
  /** owner-facing note (e.g. the not-enough-info copy or a species caution) */
  note?: string;
}

/**
 * The single source of truth for whether a supplement/herb/food may be suggested
 * for a specific pet, and how cautious to be about it.
 */
export function checkItemSafety(item: CatalogItem, pet: PetLite): SafetyVerdict {
  const reasons: string[] = [];
  const speciesLevel = item.speciesSafety[pet.species];
  const isHerbalOrSupp = item.kind === "herb" || item.kind === "supplement";
  const stage = lifeStage(pet.species, pet.ageYears);

  // Hard blocks ───────────────────────────────────────────────
  if (speciesLevel === "avoid") {
    return {
      allowed: false,
      askVetFirst: true,
      level: "avoid",
      reasons: [`Not recommended for ${pet.species}s.`],
      note: `${item.name} is not considered safe for ${pet.species}s — skip it and ask your vet about alternatives.`,
    };
  }
  const allergen = allergyConflict(item.name, pet.allergies);
  if (allergen) {
    return {
      allowed: false,
      askVetFirst: true,
      level: "avoid",
      reasons: [`Conflicts with a known allergy (${allergen}).`],
      note: `${item.name} may conflict with ${pet.name}'s ${allergen} history.`,
    };
  }
  const condition = conditionConflict(item, pet);
  if (condition) {
    return {
      allowed: false,
      askVetFirst: true,
      level: "avoid",
      reasons: [`Contraindicated: ${condition}.`],
      note: `Because of ${condition}, hold off on ${item.name} and ask your vet first.`,
    };
  }

  // Not-enough-information gate ───────────────────────────────
  // Traditional-only evidence (grade D) on a herb/supplement, for a species the
  // catalog only marks "caution", is below our confidence bar to suggest freely.
  const insufficient = isHerbalOrSupp && item.evidence === "D" && speciesLevel === "caution";
  if (insufficient) {
    return {
      allowed: true,
      askVetFirst: true,
      level: "caution",
      reasons: ["Limited species-specific safety data."],
      note: NOT_ENOUGH_INFO_COPY,
    };
  }

  // Caution flags ─────────────────────────────────────────────
  let askVetFirst = item.askVetFirst || speciesLevel === "caution";
  if (pet.species === "cat" && isHerbalOrSupp) {
    askVetFirst = true;
    reasons.push("Cats metabolize herbs and supplements differently.");
  }
  if (stage === "puppy_kitten" && isHerbalOrSupp) {
    askVetFirst = true;
    reasons.push("Extra caution for puppies/kittens.");
  }
  if (stage === "senior" && isHerbalOrSupp) {
    reasons.push("Seniors may be on other medications — check for interactions.");
  }
  if (item.medInteractions.length > 0) {
    reasons.push(`Possible interactions: ${item.medInteractions.join(", ")}.`);
  }

  const note =
    pet.species === "cat" && isHerbalOrSupp
      ? "Cats are very sensitive — confirm the product and dose with your vet."
      : speciesLevel === "caution"
        ? "Use with care for this species — confirm with your vet."
        : undefined;

  return {
    allowed: true,
    askVetFirst,
    level: speciesLevel === "caution" || askVetFirst ? "caution" : "safe",
    reasons,
    note,
  };
}
