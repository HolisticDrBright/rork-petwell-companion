/**
 * Petwell local toxin reference — types.
 *
 * V1 scope: dogs and cats only. This data ships in the app bundle so toxin
 * lookup works fully OFFLINE (no network, no Supabase needed). Every entry
 * carries provenance: the public source it was curated from, when it was last
 * reviewed, and whether a veterinarian has signed off.
 *
 * Safety rules baked into the model:
 *  - NO dosing, antidotes, decontamination, or treatment instructions live here.
 *    The data describes what a toxin is and what signs an owner might see — then
 *    routes to a vet / poison hotline. Treatment is a clinician's job.
 *  - Absence from this list NEVER implies a substance is safe (see lookup.ts).
 */

/** V1 supports dogs and cats only. */
export type ToxinSpecies = "dog" | "cat" | "both";

export type ToxinCategory =
  | "food"
  | "plant"
  | "household"
  | "medication"
  | "rodenticide"
  | "essential_oil";

/**
 * Severity of the hazard (not a clinical grade):
 *  - "toxic"   : can be life-threatening; treat any exposure as an emergency
 *  - "high"    : seriously harmful; call a vet / hotline promptly
 *  - "caution" : can cause illness (often GI/irritation); monitor and call if unsure
 */
export type ToxinSeverity = "toxic" | "high" | "caution";

/**
 * Review status drives the provenance badge and the "pending vet review" list.
 *  - "curated_public_source" : transcribed from a named public authority
 *    (ASPCA APCC / Pet Poison Helpline) but NOT yet verified by a clinician.
 *  - "vet_reviewed"          : a licensed veterinarian has reviewed this entry.
 */
export type ToxinReviewStatus = "curated_public_source" | "vet_reviewed";

export interface ToxinSource {
  name: string;
  url: string;
}

export interface ToxinEntry {
  /** Stable identifier (kebab-case). */
  slug: string;
  name: string;
  /** Lowercased match tokens / common names used for search + free-text scanning. */
  aliases: string[];
  category: ToxinCategory;
  species: ToxinSpecies;
  severity: ToxinSeverity;
  /** Body systems most affected, e.g. ["Kidney"], ["Heart", "Nervous"]. */
  bodySystems: string[];
  /** Owner-observable clinical signs — descriptive only, NEVER treatment. */
  signs: string[];
  /** One-line plain-language reason it's dangerous. No dosing/treatment. */
  note: string;
  source: ToxinSource;
  /** ISO date (YYYY-MM-DD) this entry was last reviewed/curated. */
  lastReviewed: string;
  reviewStatus: ToxinReviewStatus;
}
