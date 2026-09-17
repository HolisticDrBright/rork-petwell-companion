/**
 * Export the toxin database as a veterinarian review checklist (Markdown).
 *
 *   bun scripts/export-toxin-review.ts            # all pending entries
 *   bun scripts/export-toxin-review.ts > ../docs/toxin-review-checklist.md
 *
 * Pure + offline. Lists every entry still pending review (reviewedBy === null)
 * with its per-species severity, source, and a sign-off checkbox, so a licensed
 * vet can review the curated content before launch. Once approved, set
 * `reviewedBy` + `evidenceStatus: "vet_reviewed"` in expo/lib/toxins/data.ts.
 */
import { TOXINS } from "../lib/toxins/data";
import { SEVERITY_LABEL } from "../lib/toxins/safety";

const pending = TOXINS.filter((t) => t.reviewedBy === null);

// --csv: reviewer-friendly spreadsheet with approve/edit columns. The filled
// sheet is read back by scripts/apply-toxin-review.ts, which flips
// evidenceStatus/reviewedBy for approved rows (via lib/toxins/reviewStatus.ts).
if (process.argv.includes("--csv")) {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = [
    [
      "slug", "name", "category", "species_scope", "dog_severity", "cat_severity",
      "summary", "clinical_signs", "common_sources", "dose_warning",
      "source_publisher", "source_url", "hotline_routing",
      "approve (yes/no)", "reviewer_name_credentials", "review_date (YYYY-MM-DD)", "requested_edits",
    ].join(","),
  ];
  for (const t of TOXINS) {
    rows.push(
      [
        t.slug, t.name, t.category, t.speciesScope,
        SEVERITY_LABEL[t.dogSeverity], SEVERITY_LABEL[t.catSeverity],
        t.summary, t.clinicalSigns.join("; "), t.commonSources, t.doseWarning ?? "",
        t.source.publisher, t.source.url,
        // Emergency/severe entries route to the poison hotlines + vet in-app.
        t.dogSeverity === "emergency" || t.catSeverity === "emergency"
          ? "poison hotline + emergency vet"
          : "vet guidance",
        "", "", "", "",
      ]
        .map((v) => esc(String(v)))
        .join(","),
    );
  }
  console.log(rows.join("\n"));
  process.exit(0);
}

const lines: string[] = [];
lines.push("# Petwell toxin database — veterinary review checklist");
lines.push("");
lines.push(`${pending.length} of ${TOXINS.length} entries are pending veterinary review.`);
lines.push("");
lines.push("Review each entry for: correct per-species severity, accurate clinical signs, NO dosing/treatment");
lines.push('language, and an appropriate public source. Then set `reviewedBy` and `evidenceStatus: "vet_reviewed"`');
lines.push("in `expo/lib/toxins/data.ts`.");
lines.push("");
lines.push("| ✓ | Slug | Name | Category | Dog severity | Cat severity | Source | Last reviewed |");
lines.push("|---|---|---|---|---|---|---|---|");
for (const t of pending) {
  lines.push(
    `| [ ] | \`${t.slug}\` | ${t.name} | ${t.category} | ${SEVERITY_LABEL[t.dogSeverity]} | ${SEVERITY_LABEL[t.catSeverity]} | ${t.source.publisher} | ${t.lastReviewed} |`,
  );
}
lines.push("");
console.log(lines.join("\n"));
