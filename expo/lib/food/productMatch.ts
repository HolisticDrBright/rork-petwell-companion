/**
 * Product-match confidence — how sure are we this scanned/searched item is the
 * catalog product we matched it to? Drives the "correct this match" prompt and
 * the confidence label shown in the result. Pure + testable.
 */

export type MatchConfidence =
  | "admin_confirmed"
  | "exact_barcode"
  | "user_confirmed"
  | "strong"
  | "weak";

export interface MatchSignals {
  adminConfirmed?: boolean;
  userConfirmed?: boolean;
  exactBarcode?: boolean;
  /** 0–1 name similarity */
  nameScore?: number;
  /** 0–1 fraction of label ingredients found in the candidate */
  ingredientOverlap?: number;
}

const RANK: Record<MatchConfidence, number> = {
  admin_confirmed: 5,
  exact_barcode: 4,
  user_confirmed: 3,
  strong: 2,
  weak: 1,
};

export function matchRank(c: MatchConfidence): number {
  return RANK[c];
}

export function classifyMatch(s: MatchSignals): MatchConfidence {
  if (s.adminConfirmed) return "admin_confirmed";
  if (s.exactBarcode) return "exact_barcode";
  if (s.userConfirmed) return "user_confirmed";
  if ((s.nameScore ?? 0) >= 0.6 && (s.ingredientOverlap ?? 0) >= 0.5) return "strong";
  return "weak";
}

export const MATCH_CONFIDENCE_LABEL: Record<MatchConfidence, string> = {
  admin_confirmed: "Admin-confirmed match",
  exact_barcode: "Exact barcode match",
  user_confirmed: "You confirmed this match",
  strong: "Strong name + ingredient match",
  weak: "Weak match — please confirm",
};

/** Whether the UI should prompt the user to confirm/correct the match. */
export function shouldPromptConfirmation(c: MatchConfidence): boolean {
  return c === "weak" || c === "strong";
}
