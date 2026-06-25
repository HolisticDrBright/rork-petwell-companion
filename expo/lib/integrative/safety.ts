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

export const TOXIC_FOODS: ToxinRef[] = [
  { name: "Xylitol (birch sugar)", match: ["xylitol", "birch sugar"], species: "both", severity: "toxic", note: "Can cause life-threatening low blood sugar and liver failure in dogs." },
  { name: "Grapes / raisins", match: ["grape", "raisin", "currant", "sultana"], species: "both", severity: "toxic", note: "Linked to acute kidney injury; no safe amount is established." },
  { name: "Onion / garlic / chives", match: ["onion", "garlic", "chive", "leek", "shallot"], species: "both", severity: "high", note: "Damage red blood cells; cats are especially sensitive." },
  { name: "Chocolate / cocoa", match: ["chocolate", "cocoa", "cacao", "theobromine"], species: "both", severity: "toxic", note: "Theobromine is toxic; darker chocolate is worse." },
  { name: "Macadamia nuts", match: ["macadamia"], species: "dog", severity: "high", note: "Cause weakness, tremors and hyperthermia in dogs." },
  { name: "Caffeine", match: ["caffeine", "coffee", "espresso"], species: "both", severity: "high", note: "Stimulant toxic to pets." },
  { name: "Alcohol", match: ["alcohol", "ethanol"], species: "both", severity: "toxic", note: "Even small amounts are dangerous." },
  { name: "Raw yeast dough", match: ["raw dough", "yeast dough"], species: "both", severity: "high", note: "Expands and ferments in the stomach." },
];

export const TOXIC_PLANTS: ToxinRef[] = [
  { name: "Lily (true & day lilies)", match: ["lily", "lilies"], species: "cat", severity: "toxic", note: "Even pollen or vase water can cause fatal kidney failure in cats — remove entirely." },
  { name: "Sago palm", match: ["sago", "cycad"], species: "both", severity: "toxic", note: "Highly toxic; causes liver failure." },
  { name: "Azalea / rhododendron", match: ["azalea", "rhododendron"], species: "both", severity: "high", note: "Affects the heart and gut." },
  { name: "Autumn crocus", match: ["autumn crocus", "colchicum"], species: "both", severity: "toxic", note: "Severe multi-organ toxicity." },
  { name: "Oleander", match: ["oleander"], species: "both", severity: "toxic", note: "Cardiac toxin." },
];

/**
 * Essential oils. Cats lack the liver enzymes (glucuronidation) to process many
 * of these and can be harmed by skin contact or diffused vapor.
 */
export const RISKY_ESSENTIAL_OILS: ToxinRef[] = [
  { name: "Tea tree (melaleuca)", match: ["tea tree", "melaleuca"], species: "both", severity: "toxic", note: "Toxic to dogs and cats even in small amounts." },
  { name: "Pennyroyal", match: ["pennyroyal"], species: "both", severity: "toxic", note: "Can cause liver failure." },
  { name: "Wintergreen", match: ["wintergreen"], species: "both", severity: "high", note: "Contains salicylates (aspirin-like)." },
  { name: "Pine / fir oils", match: ["pine oil", "fir oil"], species: "cat", severity: "high", note: "Irritant; risky for cats." },
  { name: "Citrus / d-limonene", match: ["citrus oil", "d-limonene", "limonene"], species: "cat", severity: "high", note: "Cats are sensitive to citrus oils." },
  { name: "Peppermint", match: ["peppermint"], species: "cat", severity: "caution", note: "Can irritate cats; avoid direct exposure." },
  { name: "Eucalyptus", match: ["eucalyptus"], species: "cat", severity: "high", note: "Risky for cats." },
  { name: "Cinnamon / clove", match: ["cinnamon oil", "clove oil", "eugenol"], species: "both", severity: "caution", note: "Concentrated oils irritate skin and gut." },
  { name: "Ylang ylang", match: ["ylang"], species: "cat", severity: "high", note: "Risky for cats." },
];

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
