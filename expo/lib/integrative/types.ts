import type { UrgencyKey } from "@/constants/colors";

/**
 * Petwell Integrative Systems Medicine — type system.
 *
 * This layer is SUPPORTIVE, never diagnostic or a treatment for emergencies.
 * Hard safety rules (enforced deterministically in engine.ts):
 *  - Red flags / emergency urgency suppress ALL natural recommendations and
 *    route to a vet ("stabilize first"). No herbs/enzymes/supplements.
 *  - Supplements/herbs appear only when species-safe; cats get stricter gating.
 *  - Every recommendation carries an evidence grade + safety caveat + a
 *    "when to ask your vet" + "what to track" line.
 *  - Copy uses "support / may help / discuss with your vet / track response",
 *    never diagnostic claims.
 */

export type EvidenceGrade = "A" | "B" | "C" | "D";
export type ThermalNature = "warming" | "cooling" | "neutral";
export type SafetyLevel = "safe" | "caution" | "avoid";
export type RecType = "food" | "lifestyle" | "supplement" | "herb" | "monitor" | "vet" | "avoid";

export interface SpeciesSafety {
  dog: SafetyLevel;
  cat: SafetyLevel;
}

/** A natural-support catalog item (remedy / herb / supplement / food). */
export interface CatalogItem {
  id: string;
  name: string;
  kind: "supplement" | "herb" | "remedy" | "food";
  systems: string[]; // biological system ids it may support
  benefit: string; // "may help support …" — never a treatment claim
  speciesSafety: SpeciesSafety;
  evidence: EvidenceGrade;
  contraindications: string[]; // conditions / situations
  medInteractions: string[]; // drug classes
  /** Higher-risk → always "ask your vet before using this". */
  askVetFirst: boolean;
  source: string;
  // TCM energetics (mainly for foods + some herbs).
  thermalNature?: ThermalNature;
  flavor?: string;
  tcmPattern?: string;
  prep?: string;
}

export interface Recommendation {
  type: RecType;
  title: string;
  detail: string;
  evidence?: EvidenceGrade;
  speciesNote?: string;
  askVetFirst: boolean;
  contraindications: string[];
  whenToAskVet: string;
  whatToTrack: string;
  source: string;
}

export interface BiologicalSystem {
  id: string;
  label: string;
  patterns: string[];
}

export interface PetLite {
  name: string;
  species: "dog" | "cat";
  ageYears: number;
  conditions: string[];
  allergies: string[];
}

export interface PlanInput {
  system: string;
  urgency: UrgencyKey;
  redFlags: string[];
  pet: PetLite;
  conditionId?: string;
  concernLabel?: string;
}

export interface IntegrativePlan {
  system: string;
  systemLabel: string;
  pattern: string;
  urgency: UrgencyKey;
  urgencyLabel: string;
  /** True → natural recommendations are suppressed in favor of vet care. */
  emergencyOverride: boolean;
  headline: string;
  recommendations: Recommendation[];
  whenToAskVet: string[];
  whatToTrack: string[];
  sources: string[];
  safetyCaveat: string;
  conditionTemplateId?: string;
  conditionTitle?: string;
}

/** TCM "Food as Medicine" energetics for a single ingredient. */
export interface TcmEnergetics {
  ingredient: string;
  thermalNature: ThermalNature;
  flavor: string;
  tcmPattern: string;
  safety: SafetyLevel;
  caveat?: string;
  prep?: string;
}
