import { supabase } from "@/lib/supabase";

/**
 * Lightweight data-quality metrics for an admin dashboard / monitoring: how much
 * data is pending review, how many recalls are unmatched, how big the catalog is.
 * Read-only; admin-scoped by RLS.
 */
export const dataQualityService = {
  async getMetrics(): Promise<{
    pendingSubmissions: number;
    unmatchedRecalls: number;
    totalProducts: number;
    totalRecalls: number;
  }> {
    const head = { count: "exact" as const, head: true };
    const [pending, unmatched, products, recalls] = await Promise.all([
      supabase.from("ocr_label_submissions").select("id", head).eq("review_status", "pending"),
      supabase.from("recall_events").select("id", head).eq("brand_match_level", "unmatched"),
      supabase.from("food_products").select("id", head),
      supabase.from("recall_events").select("id", head),
    ]);
    return {
      pendingSubmissions: pending.count ?? 0,
      unmatchedRecalls: unmatched.count ?? 0,
      totalProducts: products.count ?? 0,
      totalRecalls: recalls.count ?? 0,
    };
  },
};
