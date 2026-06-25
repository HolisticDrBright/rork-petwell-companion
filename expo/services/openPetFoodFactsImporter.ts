import type { SupabaseClient } from "@supabase/supabase-js";

import { lookupOpenPetFoodFacts } from "@/lib/food/barcode";
import type { Database } from "@/types/db";

/**
 * Open Pet Food Facts → food_products importer. Products imported this way are
 * marked `open_database` (crowdsourced/open), never verified, until an admin
 * reviews them (→ `admin_reviewed`). Deduped by barcode.
 *
 * The Supabase client is INJECTED (see recallImporter for why): runs from a
 * server script with a service-role key, or in-app from an admin screen. No
 * React Native imports, so it's Bun/Node-safe.
 */
type Db = SupabaseClient<Database>;

export interface OpffImportResult {
  created: boolean;
  productId: string | null;
  error?: string;
}

export const openPetFoodFactsImporter = {
  async importByBarcode(db: Db, barcode: string): Promise<OpffImportResult> {
    const code = barcode.trim();
    if (!code) return { created: false, productId: null, error: "Empty barcode" };
    try {
      const { data: existing } = await db.from("food_products").select("id").eq("barcode", code).maybeSingle();
      if (existing) return { created: false, productId: existing.id };

      const opff = await lookupOpenPetFoodFacts(code);
      if (!opff.found) return { created: false, productId: null, error: "Not found in Open Pet Food Facts" };

      let brandId: string | null = null;
      if (opff.brand) {
        const { data: b } = await db.from("food_brands").select("id").ilike("name", opff.brand).maybeSingle();
        brandId = b?.id ?? null;
        if (!brandId) {
          const { data: nb } = await db.from("food_brands").insert({ name: opff.brand }).select("id").maybeSingle();
          brandId = nb?.id ?? null;
        }
      }

      const { data: prod, error } = await db
        .from("food_products")
        .insert({
          barcode: code,
          name: opff.name ?? "Unknown product",
          brand_id: brandId,
          product_type: "food",
          species: "both",
          ingredient_text: opff.ingredientsText ?? null,
          source_url: `https://world.openpetfoodfacts.org/product/${code}`,
          evidence_status: "open_database",
          match_confidence: "exact_barcode",
        })
        .select("id")
        .maybeSingle();
      if (error) return { created: false, productId: null, error: error.message };
      return { created: true, productId: prod?.id ?? null };
    } catch (e) {
      return { created: false, productId: null, error: e instanceof Error ? e.message : String(e) };
    }
  },

  /** Import a list of barcodes; returns per-barcode results. */
  async importMany(db: Db, barcodes: string[]): Promise<{ created: number; skipped: number; errors: string[] }> {
    const out = { created: 0, skipped: 0, errors: [] as string[] };
    for (const code of barcodes) {
      const r = await this.importByBarcode(db, code);
      if (r.created) out.created++;
      else out.skipped++;
      if (r.error) out.errors.push(`${code}: ${r.error}`);
    }
    return out;
  },
};
