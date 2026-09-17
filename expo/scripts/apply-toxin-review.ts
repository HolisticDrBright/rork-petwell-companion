/**
 * Apply a veterinarian's filled-in toxin review spreadsheet.
 *
 *   bun scripts/apply-toxin-review.ts ../docs/review/toxin-review.filled.csv
 *
 * Reads the CSV produced by `export-toxin-review.ts --csv` after the reviewer
 * fills the `approve (yes/no)`, `reviewer_name_credentials`, and
 * `review_date (YYYY-MM-DD)` columns, then REGENERATES
 * `lib/toxins/reviewStatus.ts` so approved entries render as
 * `vet_reviewed` with the reviewer's credit. Rows that aren't approved (or
 * carry `requested_edits`) are left pending and listed for follow-up.
 *
 * Pure + offline: edits only the overrides file; the curated content itself is
 * never touched by this script.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { TOXINS } from "../lib/toxins/data";

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cur);
      cur = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }
  row.push(cur);
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun scripts/apply-toxin-review.ts <filled-review.csv>");
  process.exit(1);
}

const rows = parseCsv(readFileSync(file, "utf8"));
const header = rows[0].map((h) => h.trim().toLowerCase());
const col = (name: string) => header.findIndex((h) => h.startsWith(name));
const iSlug = col("slug");
const iApprove = col("approve");
const iReviewer = col("reviewer_name");
const iDate = col("review_date");
const iEdits = col("requested_edits");
if (iSlug < 0 || iApprove < 0 || iReviewer < 0 || iDate < 0) {
  console.error("CSV is missing required columns (slug / approve / reviewer_name_credentials / review_date).");
  process.exit(1);
}

const knownSlugs = new Set(TOXINS.map((t) => t.slug));
const approved: { slug: string; reviewedBy: string; reviewedOn: string }[] = [];
const pendingEdits: string[] = [];
const problems: string[] = [];

for (const r of rows.slice(1)) {
  const slug = (r[iSlug] ?? "").trim();
  if (!slug) continue;
  if (!knownSlugs.has(slug)) {
    problems.push(`unknown slug: ${slug}`);
    continue;
  }
  const approve = (r[iApprove] ?? "").trim().toLowerCase();
  const edits = (r[iEdits] ?? "").trim();
  if (edits) pendingEdits.push(`${slug}: ${edits}`);
  if (approve !== "yes" && approve !== "y") continue;
  if (edits) {
    // An approval with requested edits is not a sign-off — hold it back.
    problems.push(`${slug}: approved but has requested_edits — resolve the edit first`);
    continue;
  }
  const reviewedBy = (r[iReviewer] ?? "").trim();
  const reviewedOn = (r[iDate] ?? "").trim();
  if (!reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn)) {
    problems.push(`${slug}: approved but reviewer name or review date (YYYY-MM-DD) is missing`);
    continue;
  }
  approved.push({ slug, reviewedBy, reviewedOn });
}

approved.sort((a, b) => a.slug.localeCompare(b.slug));
const q = (s: string) => `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
const entries = approved
  .map((a) => `  ${q(a.slug)}: { reviewedBy: ${q(a.reviewedBy)}, reviewedOn: ${q(a.reviewedOn)} },`)
  .join("\n");

const out = `/**
 * Veterinary sign-off state for the bundled toxin database.
 *
 * This file is MACHINE-MANAGED by \`scripts/apply-toxin-review.ts\`, which reads
 * the reviewer's filled-in spreadsheet (\`scripts/export-toxin-review.ts --csv\`)
 * and regenerates the map below. Entries listed here render as vet-reviewed
 * (\`evidenceStatus: "vet_reviewed"\` + the reviewer's name); everything else
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
${entries || "  // No entries have completed veterinary review yet."}
};
`;

writeFileSync(join(__dirname, "..", "lib", "toxins", "reviewStatus.ts"), out);

console.log(`Applied: ${approved.length} of ${TOXINS.length} entries now vet-reviewed.`);
if (pendingEdits.length) {
  console.log(`\nRequested edits (${pendingEdits.length}) — update lib/toxins/data.ts, then re-export for sign-off:`);
  for (const e of pendingEdits) console.log(`  - ${e}`);
}
if (problems.length) {
  console.log(`\nHeld back (${problems.length}):`);
  for (const p of problems) console.log(`  - ${p}`);
}
console.log("\nNext: bun tests/toxins.test.ts && git diff lib/toxins/reviewStatus.ts");
