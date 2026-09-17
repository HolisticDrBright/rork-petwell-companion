/**
 * Export the symptom knowledge base as a veterinary review spreadsheet (CSV).
 *
 *   bun scripts/export-symptom-kb-review.ts > ../docs/review/symptom-kb-review.csv
 *
 * Pure + offline: exports the bundled 43-entry seed (lib/symptomKb/data.ts,
 * the same content migration 0021 + the admin import load into
 * `symptom_kb_entries`). The reviewer checks each entry's urgency rule and
 * hedged wording, fills the approve/reviewer/date columns, and the filled
 * sheet is applied to the LIVE table by scripts/apply-symptom-kb-review.ts
 * (flips review_status → 'vet_reviewed' with the reviewer credit).
 */
import { SYMPTOM_KB } from "../lib/symptomKb/data";

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
const rows = [
  [
    "area", "title", "species", "feature", "urgency", "may_indicate",
    "watch_for", "match_tokens", "related_concern", "source",
    "approve (yes/no)", "reviewer_name_credentials", "review_date (YYYY-MM-DD)", "requested_edits",
  ].join(","),
];
for (const e of SYMPTOM_KB) {
  rows.push(
    [
      e.area, e.title, e.species, e.feature, e.urgency, e.mayIndicate,
      e.watchFor.join("; "), e.matchTokens.join("; "), e.relatedConcern ?? "",
      `${e.source.name}${e.source.url ? ` (${e.source.url})` : ""}`,
      "", "", "", "",
    ]
      .map((v) => esc(String(v)))
      .join(","),
  );
}
console.log(rows.join("\n"));
