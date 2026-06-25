/**
 * Import products from Open Pet Food Facts (open/crowdsourced) by barcode.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… bun scripts/import-opff.ts <barcode> [barcode...]
 *
 * Imported products are marked `open_database` (NOT verified) and stay pending an
 * admin review (→ `admin_reviewed`) before they're trusted. Deduped by barcode.
 *
 * NOTE: not run in this repo's CI (needs a live project + service-role key).
 */
import { openPetFoodFactsImporter } from "../services/openPetFoodFactsImporter";
import { makeServiceClient } from "./_client";

async function main() {
  const db = makeServiceClient();
  if (!db) process.exit(1);
  const barcodes = process.argv.slice(2).filter(Boolean);
  if (barcodes.length === 0) {
    console.error("Usage: bun scripts/import-opff.ts <barcode> [barcode...]");
    process.exit(1);
  }
  console.log(`[opff] importing ${barcodes.length} barcode(s) as open_database (pending review)…`);
  const r = await openPetFoodFactsImporter.importMany(db, barcodes);
  console.log(`[opff] created=${r.created} skipped=${r.skipped} errors=${r.errors.length}`);
  if (r.errors.length) console.log(r.errors.join("\n"));
}

main().catch((e) => {
  console.error("[opff] fatal:", e);
  process.exit(1);
});
