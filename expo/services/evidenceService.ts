import { recallBadge, sourceTypeLabel } from "@/lib/food/provenance";
import { supabase } from "@/lib/supabase";

import { labEvidenceService } from "./labEvidenceService";

/**
 * One place to read all evidence behind a product: recalls (with the
 * brand-level-vs-product distinction), lab evidence summary, and cited sources.
 */
export const evidenceService = {
  async getProductEvidence(productId: string | null, brandId: string | null) {
    const recalls: { reason: string; date: string | null; badge: ReturnType<typeof recallBadge>; sourceUrl: string | null }[] = [];
    if (productId || brandId) {
      const orFilter = [productId ? `product_id.eq.${productId}` : null, brandId ? `brand_id.eq.${brandId}` : null]
        .filter(Boolean)
        .join(",");
      const { data } = await supabase
        .from("recall_events")
        .select("reason, recall_date, brand_match_level, product_id, source_url")
        .or(orFilter)
        .order("recall_date", { ascending: false });
      for (const r of data ?? []) {
        const level = (r.product_id ? "product" : (r.brand_match_level as "brand" | "unmatched" | null)) ?? "unmatched";
        recalls.push({ reason: r.reason, date: r.recall_date, badge: recallBadge(level), sourceUrl: r.source_url });
      }
    }

    const lab = await labEvidenceService.getForProduct(productId, brandId);

    const sources: { title: string; url: string | null; typeLabel: string }[] = [];
    if (productId) {
      const { data } = await supabase
        .from("evidence_links")
        .select("evidence_sources(title, url, source_type)")
        .eq("product_id", productId)
        .limit(20);
      for (const row of data ?? []) {
        const s = row.evidence_sources as { title: string; url: string | null; source_type: string | null } | null;
        if (s) sources.push({ title: s.title, url: s.url, typeLabel: sourceTypeLabel(s.source_type) });
      }
    }

    return { recalls, lab, sources };
  },
};
