/**
 * Per-pet recall alert matching — pure logic (tested in tests/data.test.ts).
 *
 * A recall "may affect" a pet when the pet has a food log whose product
 * belongs to the recalled brand, or whose free-text label mentions the brand
 * name. Brand-level honesty is preserved: the alert says the recall MAY
 * affect a food the pet eats — it never claims the exact product was
 * recalled (brand_match_level stays brand-level upstream).
 *
 * Exactly ONE alert per (pet, recall) pair, regardless of how many logs
 * match; the notification deep-links to the recall's FDA source URL.
 */

export interface RecallForMatching {
  id: string;
  brandId: string | null;
  brandName: string | null;
  reason: string;
  sourceUrl: string | null;
  recallDate: string | null;
}

export interface FedLogForMatching {
  petId: string;
  productId: string | null;
  label: string;
}

export interface PetRecallAlert {
  petId: string;
  recallId: string;
  brandName: string | null;
  reason: string;
  /** FDA source link the notification opens. */
  url: string;
}

const FDA_RECALLS_PAGE = "https://www.fda.gov/animal-veterinary/safety-health/recalls-withdrawals";

/** Match recalls to the pets that have been fed the recalled brand. */
export function matchRecallsToPets(
  recalls: RecallForMatching[],
  logs: FedLogForMatching[],
  productBrand: Map<string, string | null>,
): PetRecallAlert[] {
  const out: PetRecallAlert[] = [];
  const seen = new Set<string>();
  for (const recall of recalls) {
    const brandNeedle = (recall.brandName ?? "").trim().toLowerCase();
    for (const log of logs) {
      const brandOfProduct = log.productId ? (productBrand.get(log.productId) ?? null) : null;
      const byProduct = !!recall.brandId && brandOfProduct === recall.brandId;
      const byLabel = brandNeedle.length > 3 && log.label.toLowerCase().includes(brandNeedle);
      if (!byProduct && !byLabel) continue;
      const key = `${log.petId}:${recall.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        petId: log.petId,
        recallId: recall.id,
        brandName: recall.brandName,
        reason: recall.reason,
        url: recall.sourceUrl || FDA_RECALLS_PAGE,
      });
    }
  }
  return out;
}
