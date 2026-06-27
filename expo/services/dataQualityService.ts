import { dataModeLabel } from "@/lib/dataMode";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { TOXINS } from "@/lib/toxins/data";
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

/** High-level "where is our data coming from" snapshot for the admin panel. */
export interface DataSourceStatus {
  supabaseConnected: boolean;
  dataMode: string;
  foodProducts: number;
  openDatabaseProducts: number;
  adminReviewedProducts: number;
  pendingReviewProducts: number;
  demoSeedProducts: number;
  labTotal: number;
  labRealVerified: number;
  labDemo: number;
  verifiedProductCoaRows: number;
  recalls: number;
  lastRecallImport: string | null;
  lastOpffImport: string | null;
  toxinEntries: number;
  vetReviewedToxins: number;
  pendingVetReviewToxins: number;
  aiExtractedPending: number;
}

export const dataQualityService = {
  /** Provenance/data-source snapshot for the admin "Data Source Status" panel. */
  async getDataSourceStatus(): Promise<DataSourceStatus> {
    const vetReviewedToxins = TOXINS.filter((t) => t.evidenceStatus === "vet_reviewed").length;
    const localToxins = {
      toxinEntries: TOXINS.length,
      vetReviewedToxins,
      pendingVetReviewToxins: TOXINS.length - vetReviewedToxins,
    };
    if (!isSupabaseConfigured) {
      return {
        supabaseConnected: false,
        dataMode: dataModeLabel(),
        foodProducts: 0,
        openDatabaseProducts: 0,
        adminReviewedProducts: 0,
        pendingReviewProducts: 0,
        demoSeedProducts: 0,
        labTotal: 0,
        labRealVerified: 0,
        labDemo: 0,
        verifiedProductCoaRows: 0,
        recalls: 0,
        lastRecallImport: null,
        lastOpffImport: null,
        ...localToxins,
        aiExtractedPending: 0,
      };
    }
    const head = { count: "exact" as const, head: true };
    const lastImport = (source: string) =>
      supabase
        .from("data_import_runs")
        .select("finished_at")
        .eq("source", source)
        .eq("status", "success")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    const [products, openDb, adminReviewed, pendingReview, demoSeed, labTotal, labReal, labDemo, verifiedCoa, recalls, recallRun, opffRun, aiPending] =
      await Promise.all([
        supabase.from("food_products").select("id", head),
        supabase.from("food_products").select("id", head).eq("evidence_status", "open_database"),
        supabase.from("food_products").select("id", head).eq("evidence_status", "admin_reviewed"),
        supabase.from("food_products").select("id", head).eq("evidence_status", "crowdsourced_unverified"),
        supabase.from("food_products").select("id", head).eq("evidence_status", "demo_seed"),
        supabase.from("lab_tests").select("id", head),
        supabase.from("lab_tests").select("id", head).in("evidence_status", REAL_LAB_STATUSES),
        supabase.from("lab_tests").select("id", head).eq("evidence_status", "demo_seed"),
        supabase.from("lab_tests").select("id", head).eq("level", "product").in("evidence_status", REAL_LAB_STATUSES),
        supabase.from("recall_events").select("id", head),
        lastImport("openfda_recalls"),
        lastImport("open_pet_food_facts"),
        supabase.from("ai_extracted_records").select("id", head).eq("review_status", "needs_review"),
      ]);
    return {
      supabaseConnected: true,
      dataMode: dataModeLabel(),
      foodProducts: products.count ?? 0,
      openDatabaseProducts: openDb.count ?? 0,
      adminReviewedProducts: adminReviewed.count ?? 0,
      pendingReviewProducts: pendingReview.count ?? 0,
      demoSeedProducts: demoSeed.count ?? 0,
      labTotal: labTotal.count ?? 0,
      labRealVerified: labReal.count ?? 0,
      labDemo: labDemo.count ?? 0,
      verifiedProductCoaRows: verifiedCoa.count ?? 0,
      recalls: recalls.count ?? 0,
      lastRecallImport: (recallRun.data as { finished_at?: string } | null)?.finished_at ?? null,
      lastOpffImport: (opffRun.data as { finished_at?: string } | null)?.finished_at ?? null,
      ...localToxins,
      aiExtractedPending: aiPending.count ?? 0,
    };
  },

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
