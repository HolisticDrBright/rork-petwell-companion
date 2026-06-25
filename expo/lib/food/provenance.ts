/**
 * Evidence & provenance model — the single source of truth for the four
 * questions every claim must answer: where it came from, when it was reviewed,
 * what kind of evidence it is, and how confident the user should be.
 *
 * Hard rules encoded here:
 *  - No lab evidence → confidence stays "none"/"low" and we say "No public lab
 *    test found". A photo NEVER raises purity confidence.
 *  - Demo/seed evidence is never presented as verified.
 *  - Brand-level evidence is never presented as product-level.
 *  - Stale (expired) lab data is labelled stale.
 */

export type EvidenceStatus =
  | "verified_official"
  | "verified_lab"
  | "brand_claim"
  | "open_database"
  | "crowdsourced_unverified"
  | "admin_reviewed"
  | "demo_seed"
  | "stale"
  | "rejected";

export type EvidenceLevel = "product" | "brand" | "batch" | "study";
export type BadgeTone = "good" | "info" | "warn" | "muted" | "danger";

export interface Badge {
  label: string;
  tone: BadgeTone;
}

/** Human label for the provenance enum (used on evidence chips). */
export const EVIDENCE_STATUS_BADGE: Record<EvidenceStatus, Badge> = {
  verified_official: { label: "Official source", tone: "good" },
  verified_lab: { label: "Lab verified", tone: "good" },
  brand_claim: { label: "Brand-stated", tone: "info" },
  open_database: { label: "Open database", tone: "info" },
  crowdsourced_unverified: { label: "User submitted · needs review", tone: "warn" },
  admin_reviewed: { label: "Admin reviewed", tone: "good" },
  demo_seed: { label: "Demo data", tone: "warn" },
  stale: { label: "Stale data", tone: "warn" },
  rejected: { label: "Rejected", tone: "danger" },
};

/** Ranking so product-level/verified evidence sorts above brand-level/demo. */
export function evidenceStatusRank(s: EvidenceStatus): number {
  switch (s) {
    case "verified_official":
    case "verified_lab":
      return 6;
    case "admin_reviewed":
      return 5;
    case "brand_claim":
      return 4;
    case "open_database":
      return 3;
    case "crowdsourced_unverified":
      return 2;
    case "demo_seed":
      return 1;
    case "stale":
    case "rejected":
      return 0;
  }
}

export function evidenceLevelRank(level: EvidenceLevel): number {
  switch (level) {
    case "product":
      return 4;
    case "batch":
      return 3;
    case "brand":
      return 2;
    case "study":
      return 1;
  }
}

/** Is a lab/COA result past its freshness window? */
export function isStale(expiresAt: string | null | undefined, nowIso: string): boolean {
  if (!expiresAt) return false;
  return expiresAt < nowIso.slice(0, 10);
}

export type ContaminantConfidence = "none" | "low" | "moderate" | "high";

export interface LabEvidenceInput {
  hasEvidence: boolean;
  level?: EvidenceLevel;
  demoOnly: boolean;
  stale: boolean;
  flagged: boolean; // a result is elevated/fail
  realProductTests: number; // count of non-demo product-level passing tests
}

/**
 * Map lab evidence to the user-facing purity statement + confidence. This is the
 * function that guarantees we never overclaim.
 */
export function labEvidence(input: LabEvidenceInput): { confidence: ContaminantConfidence; badge: Badge; text: string } {
  if (!input.hasEvidence) {
    return {
      confidence: "none",
      badge: { label: "No lab data", tone: "muted" },
      text: "No public lab test found. A photo can't detect heavy metals, microplastics, pesticides, PFAS, plasticizers, or mycotoxins — those need lab evidence.",
    };
  }
  if (input.flagged) {
    return {
      confidence: "low",
      badge: { label: "Lab result flagged", tone: "danger" },
      text: "A lab result is flagged elevated/failing — treat purity with caution and verify with the brand.",
    };
  }
  if (input.demoOnly) {
    return {
      confidence: "low",
      badge: { label: "Demo data only", tone: "warn" },
      text: "Only demo/seed lab data is on file — illustrative, not real testing. Real confidence needs verified lab reports.",
    };
  }
  if (input.stale) {
    return {
      confidence: "low",
      badge: { label: "Expired/stale lab data", tone: "warn" },
      text: "The lab data on file is past its freshness window — treat it as stale until re-tested.",
    };
  }
  if (input.level === "product" && input.realProductTests > 0) {
    return {
      confidence: input.realProductTests >= 2 ? "high" : "moderate",
      badge: { label: "Product-level lab", tone: "good" },
      text: "Verified product-level lab data on file. Even so, a photo alone can't establish purity.",
    };
  }
  // Evidence exists but only at the brand level (or unspecified) — never present as product-level.
  return {
    confidence: "low",
    badge: { label: "Brand-level only", tone: "info" },
    text: "Brand-level evidence only — not specific to this product/lot. Treat product purity as unconfirmed.",
  };
}

/** Recall provenance label — keeps "brand-level match" distinct from an exact product recall. */
export function recallBadge(brandMatchLevel: "product" | "brand" | "unmatched" | null | undefined): Badge {
  if (brandMatchLevel === "product") return { label: "Official FDA Recall", tone: "danger" };
  if (brandMatchLevel === "brand") return { label: "Brand-level recall match", tone: "warn" };
  return { label: "Recall history found", tone: "warn" };
}

export const SOURCE_TYPE_LABEL: Record<string, string> = {
  openfda: "openFDA (official)",
  fda: "FDA (official)",
  open_pet_food_facts: "Open Pet Food Facts (open database)",
  open_food_facts: "Open Food Facts (open database)",
  brand: "Brand-stated",
  study: "Peer-reviewed study",
  lab: "Third-party lab",
  demo: "Demo / seed",
  user: "User submitted",
  admin: "Admin reviewed",
};

export function sourceTypeLabel(sourceType: string | null | undefined): string {
  if (!sourceType) return "Source unknown";
  return SOURCE_TYPE_LABEL[sourceType] ?? sourceType;
}
