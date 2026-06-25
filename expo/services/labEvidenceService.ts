import { isStale, labEvidence } from "@/lib/food/provenance";
import { supabase } from "@/lib/supabase";

/**
 * Aggregates lab evidence for a product/brand from contaminant_tests (legacy,
 * product-level) + the generalized lab_tests (product/brand/batch/study), and
 * maps it to the never-overclaim labEvidence() summary.
 */

interface TestRow {
  isDemo: boolean;
  status: string | null;
  level: string;
  expiresAt: string | null;
}

export const labEvidenceService = {
  async getForProduct(productId: string | null, brandId: string | null, nowIso: string = new Date().toISOString()) {
    const rows: TestRow[] = [];

    if (productId) {
      const { data } = await supabase
        .from("contaminant_tests")
        .select("is_demo, status, level, expires_at")
        .eq("product_id", productId);
      for (const t of data ?? []) {
        rows.push({ isDemo: !!t.is_demo, status: t.status, level: t.level ?? "product", expiresAt: t.expires_at });
      }
      const { data: lp } = await supabase
        .from("lab_tests")
        .select("evidence_status, status, level, expires_at")
        .eq("product_id", productId);
      for (const t of lp ?? []) {
        rows.push({ isDemo: t.evidence_status === "demo_seed", status: t.status, level: t.level ?? "product", expiresAt: t.expires_at });
      }
    }
    if (brandId) {
      const { data: lb } = await supabase
        .from("lab_tests")
        .select("evidence_status, status, level, expires_at")
        .eq("brand_id", brandId);
      for (const t of lb ?? []) {
        rows.push({ isDemo: t.evidence_status === "demo_seed", status: t.status, level: t.level ?? "brand", expiresAt: t.expires_at });
      }
    }

    const hasEvidence = rows.length > 0;
    const passing = (s: string | null) => s === "pass" || s === "not_detected";
    const realProductTests = rows.filter((t) => !t.isDemo && t.level === "product" && passing(t.status)).length;
    const demoOnly = hasEvidence && rows.every((t) => t.isDemo);
    const stale = hasEvidence && rows.some((t) => isStale(t.expiresAt, nowIso));
    const flagged = rows.some((t) => t.status === "elevated" || t.status === "fail");
    const level: "product" | "brand" = rows.some((t) => t.level === "product") ? "product" : "brand";

    return labEvidence({ hasEvidence, level, demoOnly, stale, flagged, realProductTests });
  },
};
