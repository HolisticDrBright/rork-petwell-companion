/**
 * Symptom image knowledge base — data model.
 *
 * Maps OBSERVABLE visual features (from `ai-vision-symptom`, or manual notes) to
 * conservative, source-backed context: what a feature *may* relate to, how urgent
 * it looks, what to watch for, and which rule-based triage to hand off to. It is
 * NEVER a diagnosis. Every entry cites a source and defaults to `needs_vet_review`
 * until a licensed vet signs off — mirroring the toxin/integrative provenance model.
 */

export type KbArea = "poop" | "skin" | "ear" | "eye" | "teeth";
export type KbSpecies = "dog" | "cat" | "both";

/** How urgent the *observation* looks. Drives a "see your vet" nudge — it never
 *  overrides the deterministic emergency/toxin routing, which stays authoritative. */
export type KbUrgency = "info" | "watch" | "vet_soon" | "emergency";

/** Clinical interpretations need a vet. Entries stay pending until reviewed. */
export type KbReviewStatus = "needs_vet_review" | "vet_reviewed";

export interface KbSource {
  name: string;
  url?: string;
}

export interface SymptomKbEntry {
  id: string;
  species: KbSpecies;
  area: KbArea;
  /** Loose grouping of the observed feature (e.g. "stool_color", "gum_color"). */
  feature: string;
  /** Lowercase tokens that, if present in an observed value/summary, match this entry. */
  matchTokens: string[];
  /** Short human label, e.g. "Black or tarry stool". */
  title: string;
  /** Conservative, hedged context — "can be associated with…". NEVER "your pet has…". */
  mayIndicate: string;
  urgency: KbUrgency;
  watchFor: string[];
  /** Triage concern id to hand off to (the real, rule-based check). */
  relatedConcern: string;
  source: KbSource;
  reviewStatus: KbReviewStatus;
}

export const URGENCY_RANK: Record<KbUrgency, number> = {
  info: 0,
  watch: 1,
  vet_soon: 2,
  emergency: 3,
};

export const URGENCY_LABEL: Record<KbUrgency, string> = {
  info: "Informational",
  watch: "Worth watching",
  vet_soon: "See your vet soon",
  emergency: "Urgent — contact a vet now",
};
