/**
 * Barcode lookup via Open Pet Food Facts. Used only to IDENTIFY a product (name,
 * brand, printed ingredients) — never to assert purity. Network failures resolve
 * to a not-found result so callers can fall back to the local catalog or manual
 * search without throwing.
 */

export interface BarcodeProduct {
  barcode: string;
  name: string | null;
  brand: string | null;
  ingredientsText: string | null;
  found: boolean;
  source: "openpetfoodfacts" | "none";
}

const OPFF_URL = "https://world.openpetfoodfacts.org/api/v2/product";

export async function lookupOpenPetFoodFacts(
  barcode: string,
  opts?: { signal?: AbortSignal }
): Promise<BarcodeProduct> {
  const code = (barcode ?? "").replace(/\s/g, "");
  const empty: BarcodeProduct = {
    barcode: code,
    name: null,
    brand: null,
    ingredientsText: null,
    found: false,
    source: "none",
  };
  if (!code) return empty;

  try {
    const res = await fetch(
      `${OPFF_URL}/${encodeURIComponent(code)}.json?fields=product_name,brands,ingredients_text`,
      { signal: opts?.signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return empty;
    const json: {
      status?: number;
      product?: { product_name?: string; brands?: string; ingredients_text?: string };
    } = await res.json();
    if (!json || json.status !== 1 || !json.product) return empty;
    const p = json.product;
    return {
      barcode: code,
      name: p.product_name?.trim() || null,
      brand: p.brands ? String(p.brands).split(",")[0].trim() || null : null,
      ingredientsText: p.ingredients_text?.trim() || null,
      found: true,
      source: "openpetfoodfacts",
    };
  } catch {
    return empty; // offline / blocked → caller falls back to catalog or manual
  }
}
