// Live marketplace catalog (marketplace_products) — the researched supplement
// products from 0028 plus anything added later via admin. Demo "(example)" rows
// are hidden in production exactly like demo food products; the screen falls
// back to the bundled research-preview catalog when this returns nothing.
import { mapMarketplaceRow, type MarketplaceProduct } from "@/lib/integrative/marketplace";
import { excludeDemoProducts } from "@/lib/food/productVisibility";
import { supabase } from "@/lib/supabase";

export const marketplaceService = {
  /** Every visible catalog product (all categories); RLS: world-readable. */
  async listCatalog(): Promise<MarketplaceProduct[]> {
    const query = supabase
      .from("marketplace_products")
      .select(
        "slug, category, name, species, evidence, transparency, ingredient_quality, lab_tested, reported_outcomes, fit_tags, blurb, brand, product_url, affiliate_url, affiliate_program, nasc_seal",
      )
      .order("name", { ascending: true })
      .limit(500);
    const { data, error } = await excludeDemoProducts(query);
    if (error) throw new Error(error.message);
    return (data ?? [])
      .map((row) => mapMarketplaceRow(row as Parameters<typeof mapMarketplaceRow>[0]))
      .filter((p): p is MarketplaceProduct => p !== null);
  },
};
