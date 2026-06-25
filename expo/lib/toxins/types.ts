/**
 * Petwell local toxin reference — types (aligned to the approved design spec:
 * docs/superpowers/specs/2026-06-25-toxin-database-design.md).
 *
 * V1 scope: dogs and cats only. Data ships in the app bundle so lookup works
 * fully OFFLINE, with an optional Supabase hydration path later (toxinService).
 *
 * Safety rules baked in:
 *  - NO dosing, antidotes, decontamination, or treatment instructions. We
 *    describe the hazard, where pets meet it, and the signs an owner might see —
 *    then route to a vet / poison hotline. `doseWarning` is a *warning* (e.g.
 *    "no amount is known to be safe"), never a dose calculator.
 *  - Severity is PER-SPECIES; the same item can be an emergency for cats and a
 *    caution for dogs (e.g. true lilies, acetaminophen).
 *  - Absence from this list NEVER implies a substance is safe (see search.ts).
 */

/** V1 supports dogs and cats only. */
export type ToxinSpeciesScope = "dog" | "cat" | "both";

export type ToxinCategory =
  | "food"
  | "plant"
  | "medication"
  | "supplement"
  | "household"
  | "essential_oil"
  | "recreational";

/**
 * Per-species severity (spec vocabulary):
 *  - "emergency"    : call a vet / poison control now
 *  - "high"         : contact a vet / poison control promptly
 *  - "caution"      : may be unsafe depending on amount/size/context; ask a vet
 *  - "usually_safe" : not known to be toxic, but monitor and call if signs appear
 *  - "unknown"      : not enough information; ask a vet / poison control
 */
export type ToxinSeverity = "emergency" | "high" | "caution" | "usually_safe" | "unknown";

/** Provenance state of an entry (spec vocabulary). */
export type ToxinEvidenceStatus = "source_cited" | "vet_reviewed" | "needs_review" | "deprecated";

export interface ToxinSource {
  name: string;
  publisher: string;
  url: string;
  /** spec source_type */
  type: "poison_control_public" | "veterinary_manual" | "regulatory" | "academic" | "manufacturer" | "internal_review";
}

export interface ToxinEntry {
  slug: string;
  name: string;
  category: ToxinCategory;
  speciesScope: ToxinSpeciesScope;
  dogSeverity: ToxinSeverity;
  catSeverity: ToxinSeverity;
  /** Lowercased common names / lay terms / brand-like terms for search + text scan. */
  aliases: string[];
  /** Body systems most affected, e.g. ["Kidney"], ["Heart", "Nervous"]. */
  bodySystems: string[];
  /** Concise, original Petwell summary of why it's dangerous. No treatment. */
  summary: string;
  /** Owner-observable clinical signs — descriptive only, NEVER treatment. */
  clinicalSigns: string[];
  /** Where pets typically encounter it. */
  commonSources: string;
  /** Optional non-dosing warning, e.g. "No amount is known to be safe." */
  doseWarning?: string;
  /** Primary cited source. */
  source: ToxinSource;
  evidenceStatus: ToxinEvidenceStatus;
  /** ISO date (YYYY-MM-DD) this entry was last reviewed/curated. */
  lastReviewed: string;
  /** Veterinarian (or reviewer) who signed off, or null when pending review. */
  reviewedBy: string | null;
}
