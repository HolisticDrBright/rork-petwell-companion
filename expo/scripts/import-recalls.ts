/**
 * Import recent FDA pet-food recalls from openFDA into recall_events.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… bun scripts/import-recalls.ts [limit]
 *
 * Idempotent (upsert on dedup_key). Logs each run to data_import_runs. Recalls are
 * brand-matched at most (brand-level ≠ exact product recall) and marked
 * `verified_official`. Intended as a scheduled server job (cron / CI / Edge fn).
 *
 * NOTE: not run in this repo's CI (needs a live project + service-role key).
 */
import { recallImporter } from "../services/recallImporter";
import { makeServiceClient } from "./_client";

async function main() {
  const db = makeServiceClient();
  if (!db) process.exit(1);
  const limit = Number(process.argv[2] ?? 200);
  console.log(`[recalls] importing up to ${limit} openFDA food-enforcement records…`);
  const r = await recallImporter.run(db, { limit });
  console.log(`[recalls] seen=${r.seen} created=${r.created} skipped=${r.skipped} errors=${r.errors.length}`);
  if (r.errors.length) console.log("first errors:\n" + r.errors.slice(0, 5).join("\n"));
}

main().catch((e) => {
  console.error("[recalls] fatal:", e);
  process.exit(1);
});
