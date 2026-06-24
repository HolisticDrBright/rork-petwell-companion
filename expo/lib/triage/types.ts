import type { UrgencyKey } from "@/constants/colors";
import type { Pet } from "@/types/pet";

/**
 * Petwell adaptive triage — type system.
 *
 * The engine is deterministic. Red-flag rules can only RAISE urgency, never
 * lower it. An optional AI layer may rephrase questions or polish the summary
 * (see TriageAI), but it can never override the rules below.
 */

export type Confidence = "Low" | "Moderate" | "High";

export type RedFlagKey =
  | "breathing"
  | "collapse"
  | "seizure"
  | "paleGums"
  | "severeLethargy"
  | "toxin"
  | "trauma"
  | "repeatedVomiting"
  | "bloodStoolVomit"
  | "cantUrinate"
  | "youngWithGI"
  | "seniorWorsening";

/** What selecting an answer does. All effects are additive and deterministic. */
export interface AnswerEffect {
  /** Triggers a named red-flag rule (forces a minimum urgency floor). */
  redFlag?: RedFlagKey;
  /** A hard urgency floor regardless of points. */
  urgencyFloor?: UrgencyKey;
  /** Graded urgency points (sum maps to a band). */
  points?: number;
  /** Cause id -> weight added to that cause's score. */
  causeWeights?: Record<string, number>;
  /** A "what supports this" line shown when this answer is chosen. */
  support?: string;
}

export interface AnswerOption extends AnswerEffect {
  id: string;
  label: string;
}

export interface TriageContext {
  pet: Pet;
  /** questionId -> chosen option (the "I'm not sure" choice is omitted). */
  picked: Record<string, AnswerOption>;
  /** ordered list of answered question ids (for adaptive flow + report). */
  order: string[];
}

export interface Question {
  id: string;
  text: string;
  why: string;
  kind: "redflag" | "core" | "refine";
  options: AnswerOption[];
  allowUnsure?: boolean;
  /** Adaptive: only ask when this predicate passes (default: always). */
  when?: (ctx: TriageContext) => boolean;
  /** If a red-flag option is chosen here, end the interview early. */
  shortCircuit?: boolean;
}

export interface CauseDef {
  id: string;
  name: string;
  note: string;
}

export interface ConcernModule {
  id: string;
  label: string;
  icon: string;
  baseUrgency: UrgencyKey;
  questions: Question[];
  causes: CauseDef[];
  /** Module-level "what would change the urgency". */
  changesUrgency: string[];
  /** Concern-specific home-care lines (used for Monitor/Book-soon bands). */
  homeCare: string[];
  /** Pet-aware starting weights for causes (e.g. boost food sensitivity for an allergy pet). */
  priors?: (ctx: TriageContext) => Record<string, number>;
}

export interface RankedCause {
  rank: number;
  name: string;
  note: string;
}

export interface TriageOutcome {
  urgency: UrgencyKey;
  confidence: Confidence;
  causes: RankedCause[];
  supports: string[];
  changesUrgency: string[];
  steps: string[];
  redFlags: string[];
  summary: string;
}

/** Optional AI seam. Defaults are deterministic; AI never touches urgency. */
export interface TriageAI {
  rephrase?: (q: Question, ctx: TriageContext) => string;
  summarize?: (outcome: TriageOutcome, ctx: TriageContext) => Promise<string> | string;
}
