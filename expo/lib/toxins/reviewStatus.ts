/**
 * Veterinary sign-off state for the bundled toxin database.
 *
 * This file is MACHINE-MANAGED by `scripts/apply-toxin-review.ts`, which reads
 * the reviewer's filled-in spreadsheet (`scripts/export-toxin-review.ts --csv`)
 * and regenerates the map below. Entries listed here render as vet-reviewed
 * (`evidenceStatus: "vet_reviewed"` + the reviewer's name); everything else
 * stays "needs_review" and keeps the in-app "Pending vet review" label.
 *
 * Hand-editing is fine in a pinch — keep the shape { slug: { reviewedBy, reviewedOn } }.
 */

export interface ToxinReviewSignoff {
  /** Reviewer credit as it should appear, e.g. "Jane Doe, DVM". */
  reviewedBy: string;
  /** ISO date (YYYY-MM-DD) of the sign-off. */
  reviewedOn: string;
}

export const VET_REVIEWED_TOXINS: Record<string, ToxinReviewSignoff> = {
  // No entries have completed veterinary review yet. The app labels the whole
  // toxin database "not individually vet-reviewed" until this map fills in.
};
