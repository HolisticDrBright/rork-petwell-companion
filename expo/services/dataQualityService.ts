import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/db";

type EvidenceStatus = Database["public"]["Enums"]["evidence_status"];

/**
 * Data-quality / trust metrics for the admin dashboard. Read-only and
 * admin-scoped by RLS. Distinguishes REAL lab evidence from demo/seed and
 * no-evidence so the team can see exactly how much of the catalog is actually
 * backed by product-level lab data (vs. illustrative seed data).
 */

const REAL_LAB_STATUSES: EvidenceStatus[] = ["verified_lab", "verified_official", "admin_reviewed"];

export interface DataQualityMetrics {
  totalProducts: number;
  totalRecalls: number;
  totalLabTests: number;
  // Lab evidence quality
  realLabTests: number;
  demoLabTests: number;
  staleLabTests: number;
  productsWithRealLab: number;
  productsWithNoLab: number;
  // Product evidence basis (from food_products.evidence_status)
  openDatabaseProducts: number;
  brandClaimProducts: number;
  needsReviewProducts: number;
  // Review backlog
  pendingSubmissions: number;
  unmatchedRecalls: number;
}

export const dataQualityService = {
  async getMetrics(): Promise<DataQualityMetrics> {
    const head = { count: "exact" as const, head: true };
    const [pending, unmatched, products, recalls, labTotal, labReal, labDemo, labStale, realProductRows, openDb, brandClaim, needsReview] =
      await Promise.all([
        supabase.from("ocr_label_submissions").select("id", head).eq("review_status", "pending"),
        supabase.from("recall_events").select("id", head).eq("brand_match_level", "unmatched"),
        supabase.from("food_products").select("id", head),
        supabase.from("recall_events").select("id", head),
        supabase.from("lab_tests").select("id", head),
        supabase.from("lab_tests").select("id", head).in("evidence_status", REAL_LAB_STATUSES),
        supabase.from("lab_tests").select("id", head).eq("evidence_status", "demo_seed"),
        supabase.from("lab_tests").select("id", head).eq("evidence_status", "stale"),
        // product_ids that actually have REAL product-level lab evidence (deduped client-side)
        supabase
          .from("lab_tests")
          .select("product_id")
          .eq("level", "product")
          .in("evidence_status", REAL_LAB_STATUSES)
          .not("product_id", "is", null),
        supabase.from("food_products").select("id", head).eq("evidence_status", "open_database"),
        supabase.from("food_products").select("id", head).eq("evidence_status", "brand_claim"),
        supabase.from("food_products").select("id", head).eq("evidence_status", "crowdsourced_unverified"),
      ]);

    const productsWithRealLab = new Set((realProductRows.data ?? []).map((r) => r.product_id)).size;
    const totalProducts = products.count ?? 0;

    return {
      totalProducts,
      totalRecalls: recalls.count ?? 0,
      totalLabTests: labTotal.count ?? 0,
      realLabTests: labReal.count ?? 0,
      demoLabTests: labDemo.count ?? 0,
      staleLabTests: labStale.count ?? 0,
      productsWithRealLab,
      productsWithNoLab: Math.max(0, totalProducts - productsWithRealLab),
      openDatabaseProducts: openDb.count ?? 0,
      brandClaimProducts: brandClaim.count ?? 0,
      needsReviewProducts: needsReview.count ?? 0,
      pendingSubmissions: pending.count ?? 0,
      unmatchedRecalls: unmatched.count ?? 0,
    };
  },
};
