/**
 * Shared TypeScript shapes for AI feature inputs/outputs. These mirror the JSON
 * schemas the Edge Functions enforce (supabase/functions/_shared/schemas.ts) so
 * the app and server agree on structure. Every extraction carries needs_review.
 */

export type AiFeature =
  | "chat"
  | "explanation"
  | "food_label_vision"
  | "record_summary"
  | "coa_extraction"
  | "care_plan"
  | "vet_report_rewrite";

export type AiReviewStatus = "generated" | "needs_review" | "approved" | "rejected";

/** Present on every AI response so the UI can route emergencies deterministically. */
export interface AiSafety {
  routing: "emergency_vet" | "poison_control" | null;
  flags: string[];
  banner: string | null;
  /** True when the server refused/replaced unsafe model output. */
  refused?: boolean;
}

/** Standard envelope returned by every AI edge function. */
export interface AiEnvelope<T> {
  ok: boolean;
  /** Set when the feature is unavailable (AI disabled / no key / over budget). */
  disabled?: boolean;
  disabledReason?: string;
  error?: string;
  safety?: AiSafety;
  generationId?: string;
  data?: T;
}

// ── Feature payloads ─────────────────────────────────────────
export interface VetReportRewrite {
  vetSummary: string;
  ownerSummary: string;
}

export interface RecordSummary {
  documentDate: string | null;
  clinic: string | null;
  veterinarian: string | null;
  diagnosesOrAssessments: string[];
  symptoms: string[];
  medications: { name: string; dose: string | null; purpose: string | null }[];
  labValues: { name: string; value: string; unit: string | null; flag: string | null }[];
  imaging: string[];
  procedures: string[];
  followUp: string[];
  ownerQuestions: string[];
  redFlags: string[];
  summaryForOwner: string;
  summaryForVet: string;
  confidence: "low" | "medium" | "high";
  needsReview: true;
}

export type EvidenceLevelExtract = "product" | "brand" | "batch" | "study" | "claim_only";

export interface CoaAnalyte {
  substance: string;
  category: string | null;
  resultValue: string | null;
  unit: string | null;
  status: "pass" | "elevated" | "fail" | "not_detected" | "unknown" | null;
  detectionLimit: string | null;
}

export interface CoaExtraction {
  brand: string | null;
  product: string | null;
  batchLot: string | null;
  labName: string | null;
  testDate: string | null;
  analytes: CoaAnalyte[];
  sourceUrl: string | null;
  evidenceLevel: EvidenceLevelExtract;
  /** Always needs_review from extraction — never verified_lab automatically. */
  evidenceStatus: "needs_review" | "brand_claim";
  confidence: "low" | "medium" | "high";
  extractionNotes: string | null;
}

export interface LabelExtraction {
  brand: string | null;
  productName: string | null;
  ingredientsText: string | null;
  parsedIngredients: string[];
  guaranteedAnalysis: { name: string; value: string }[];
  aafcoStatement: string | null;
  feedingStatement: string | null;
  warnings: string[];
  confidence: "low" | "medium" | "high";
  needsReview: true;
}

export interface CarePlanDraft {
  title: string;
  summary: string;
  trackAtHome: string[];
  askYourVet: string[];
  /** Only ever populated when no red flags are present (deterministically gated). */
  gentleOptions: string[];
  redFlagsSuppressed: boolean;
  disclaimer: string;
}

export interface ChatReply {
  reply: string;
  contextUsed: string[];
  suggestedVetReport: boolean;
  threadId?: string | null;
}

export interface ExplainReply {
  explanation: string;
}
