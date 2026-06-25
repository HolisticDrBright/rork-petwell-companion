import { lookupOpenPetFoodFacts } from "@/lib/food/barcode";
import { supabase } from "@/lib/supabase";

/**
 * Open Pet Food Facts → food_products importer. Products imported this way are
 * marked `open_database` (crowdsourced/open), never verified, until an admin
 * reviews them. Deduped by barcode.
 */
export const openPetFoodFactsImporter = {
  async importByBarcode(barcode: string): Promise<{ created: boolean; productId: string | null; error?: string }> {
    const code = barcode.trim();
    if (!code) return { created: false, productId: null, error: "Empty barcode" };
    try {
      const { data: existing } = await supabase
        .from("food_products")
        .select("id")
        .eq("barcode", code)
        .maybeSingle();
      if (existing) return { created: false, productId: existing.id };

      const opff = await lookupOpenPetFoodFacts(code);
      if (!opff.found) return { created: false, productId: null, error: "Not found in Open Pet Food Facts" };

      let brandId: string | null = null;
      if (opff.brand) {
        const { data: b } = await supabase.from("food_brands").select("id").ilike("name", opff.brand).maybeSingle();
        brandId = b?.id ?? null;
        if (!brandId) {
          const { data: nb } = await supabase.from("food_brands").insert({ name: opff.brand }).select("id").maybeSingle();
          brandId = nb?.id ?? null;
        }
      }

      const { data: prod, error } = await supabase
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
};
