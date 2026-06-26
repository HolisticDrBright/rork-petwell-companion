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
  brand_claim: { label: "Brand claim only", tone: "info" },
  open_database: { label: "Open database · pending review", tone: "info" },
  crowdsourced_unverified: { label: "Needs review", tone: "warn" },
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

/**
 * Statuses that may support a REAL (non-demo) purity claim. A brand self-report
 * (`brand_claim`), open-database row, crowdsourced submission, demo seed, stale,
 * or rejected row can NEVER raise contaminant confidence — only independent lab
 * verification, an official source, or an admin sign-off can.
 */
export const PURITY_TRUSTED_STATUSES: ReadonlySet<EvidenceStatus> = new Set<EvidenceStatus>([
  "verified_lab",
  "verified_official",
  "admin_reviewed",
]);

/**
 * SAFETY-CRITICAL gate (single source of truth, used by both the purity summary
 * and the contaminant sub-score). Does this lab row count as real, current,
 * product-level evidence that may raise purity confidence? Demo, non-pass,
 * brand/study/batch-level, or unverified-status rows never qualify — matching the
 * model cap that only an independent, current, product-level COA unlocks "high".
 * A `null` status preserves legacy product seeds that predate the provenance column.
 */
export function countsAsProductLevelPurity(t: {
  isDemo: boolean;
  status: string | null;
  level?: EvidenceLevel | null;
  evidenceStatus?: EvidenceStatus | string | null;
}): boolean {
  if (t.isDemo) return false;
  if (t.status !== "pass") return false;
  if ((t.level ?? "product") !== "product") return false;
  if (t.evidenceStatus == null) return true; // legacy product seed, pre-provenance
  return PURITY_TRUSTED_STATUSES.has(t.evidenceStatus as EvidenceStatus);
}

/**
 * Is a result specific to THIS product or lot (so an elevated/fail value may flag
 * it), versus a brand- or study-level finding (e.g. a category average) that must
 * never be presented as a this-product failure? Mirrors the recall rule that a
 * brand-level match is never an exact-product recall.
 */
export function isProductSpecificResult(level: EvidenceLevel | null | undefined): boolean {
  const l = level ?? "product";
  return l === "product" || l === "batch";
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
  if (input.level === "study") {
    // A public study (e.g. a category/brand-level contaminant study) is real
    // evidence but is NOT specific to this product or lot.
    return {
      confidence: "low",
      badge: { label: "Public study", tone: "info" },
      text: "Public study evidence — not specific to this product.",
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

/**
 * Conservative, mandated evidence copy. NEVER use "cleanest / safest / pure /
 * verified clean" anywhere — those require product-level VERIFIED lab evidence,
 * which the public dataset does not have (research found ZERO public, downloadable,
 * product-level independent COAs for mainstream dog/cat brands).
 */
export const EVIDENCE_COPY = {
  /** No product-level COA found, dated. `asOf` is an ISO date (YYYY-MM-DD). */
  noProductCoa: (asOf: string) => `No public product-level COA found as of ${asOf.slice(0, 10)}.`,
  noPublicLabTest: "No public lab test found for this product.",
  brandClaimOnly: "Brand claim only — not independent lab verification.",
  publicStudy: "Public study evidence — not product-specific.",
  brandLevelOnly: "Brand-level evidence only.",
  openDatabasePending: "Open database product data; pending review.",
  pendingAdminReview: "Evidence pending admin review.",
} as const;

/**
 * Classify the strongest evidence BASIS behind a product from its (non-demo)
 * sources, with conservative copy. Strength order: public study > brand claim >
 * open database. This never implies product-level lab verification — that path is
 * `labEvidence`. Returns null when there is no real (non-demo) source.
 */
export function evidenceBasis(
  sources: { sourceType: string | null; isDemo: boolean }[],
): { label: string; tone: BadgeTone; text: string } | null {
  const real = sources.filter((s) => !s.isDemo);
  if (real.length === 0) return null;
  const has = (t: string) => real.some((s) => (s.sourceType ?? "").toLowerCase().includes(t));
  if (has("study")) return { label: "Public study", tone: "info", text: EVIDENCE_COPY.publicStudy };
  if (has("brand")) return { label: "Brand claim only", tone: "info", text: EVIDENCE_COPY.brandClaimOnly };
  if (has("open")) return { label: "Open database · pending review", tone: "info", text: EVIDENCE_COPY.openDatabasePending };
  return null;
}
