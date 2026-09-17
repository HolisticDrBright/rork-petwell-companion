/**
 * Apply a veterinarian's filled-in symptom-KB review spreadsheet to the LIVE
 * `symptom_kb_entries` table.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *     bun scripts/apply-symptom-kb-review.ts ../docs/review/symptom-kb-review.filled.csv
 *
 * Reads the CSV from `export-symptom-kb-review.ts` after the reviewer fills
 * the approve/reviewer/date columns, and for approved rows (no requested
 * edits) sets review_status = 'vet_reviewed' + last_reviewed_at, keyed by
 * (area, title) — the table's natural unique key. Rows with requested edits
 * are listed for follow-up and left pending. Idempotent; re-running is safe.
 */
import { readFileSync } from "node:fs";

import { makeServiceClient } from "./_client";

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

async function main() {
  const db = makeServiceClient();
  if (!db) process.exit(1);
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: bun scripts/apply-symptom-kb-review.ts <filled-review.csv>");
    process.exit(1);
  }

  const rows = parseCsv(readFileSync(file, "utf8"));
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.findIndex((h) => h.startsWith(name));
  const iArea = col("area");
  const iTitle = col("title");
  const iApprove = col("approve");
  const iReviewer = col("reviewer_name");
  const iDate = col("review_date");
  const iEdits = col("requested_edits");
  if (iArea < 0 || iTitle < 0 || iApprove < 0) {
    console.error("CSV is missing required columns (area / title / approve).");
    process.exit(1);
  }

  let approved = 0;
  let held = 0;
  const followUps: string[] = [];
  for (const r of rows.slice(1)) {
    const area = (r[iArea] ?? "").trim();
    const title = (r[iTitle] ?? "").trim();
    if (!area || !title) continue;
    const edits = (r[iEdits] ?? "").trim();
    if (edits) followUps.push(`${area} / ${title}: ${edits}`);
    const yes = /^y(es)?$/i.test((r[iApprove] ?? "").trim());
    if (!yes || edits) {
      if (yes && edits) held++;
      continue;
    }
    const reviewedBy = (r[iReviewer] ?? "").trim();
    const reviewedOn = (r[iDate] ?? "").trim();
    if (!reviewedBy || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn)) {
      held++;
      console.error(`held: ${area} / ${title} — reviewer name or review date missing`);
      continue;
    }
    const { error, count } = await db
      .from("symptom_kb_entries")
      .update(
        { review_status: "vet_reviewed", last_reviewed_at: new Date(`${reviewedOn}T00:00:00Z`).toISOString() },
        { count: "exact" },
      )
      .eq("area", area)
      .eq("title", title);
    if (error) {
      console.error(`error: ${area} / ${title}: ${error.message}`);
      held++;
    } else if (!count) {
      console.error(`not found in live table: ${area} / ${title} (run the admin seed import first)`);
      held++;
    } else {
      approved++;
    }
  }

  console.log(`\nApproved live: ${approved}. Held back: ${held}.`);
  if (followUps.length) {
    console.log(`Requested edits (${followUps.length}) — fix in lib/symptomKb/data.ts + the live row, then re-run:`);
    for (const f of followUps) console.log(`  - ${f}`);
  }
}

main().catch((e) => {
  console.error("[kb-review] fatal:", e);
  process.exit(1);
});
