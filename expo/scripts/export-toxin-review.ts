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
