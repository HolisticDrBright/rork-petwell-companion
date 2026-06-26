import { getUserId } from "@/lib/backend";
import type { EvidenceStatus } from "@/lib/food/provenance";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

/**
 * Admin review + audit. All mutations are RLS-gated to admins (profiles.is_admin)
 * and every action is written to admin_review_actions. If a full admin UI isn't
 * built yet, these functions back a minimal protected screen or scripts.
 */

async function logAction(
  entityType: string,
  entityId: string | null,
  action: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const admin_id = getUserId();
  if (!admin_id) return;
  await supabase.from("admin_review_actions").insert({
    admin_id,
    entity_type: entityType,
    entity_id: entityId,
    action,
    details: details ? asJson(details) : null,
  });
}

export const adminReviewService = {
  logAction,

  async listOpenQueue() {
    const { data } = await supabase
      .from("admin_review_queue")
      .select("*")
      .eq("status", "open")
      .order("priority", { ascending: false });
    return data ?? [];
  },

  /** Mark a specific queue row resolved (used by the UI once an item is handled). */
  async resolveQueueItem(queueId: string, note?: string) {
    const { error } = await supabase
      .from("admin_review_queue")
      .update({ status: "resolved", ...(note ? { note } : {}) })
      .eq("id", queueId);
    if (error) throw error;
    await logAction("queue_item", queueId, "resolve", note ? { note } : undefined);
  },

  /** Resolve any open queue rows tracking a given entity, so the queue shrinks as work is done. */
  async resolveQueueForEntity(entityType: string, entityId: string) {
    await supabase
      .from("admin_review_queue")
      .update({ status: "resolved" })
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .eq("status", "open");
  },

  /**
   * Review an imported catalog product (Open Pet Food Facts → food_products).
   * approve → admin_reviewed (trusted), reject → rejected (hidden). Resolves its
   * queue row. Open-database products stay unverified until this runs.
   */
  async reviewCatalogProduct(productId: string, action: "approve" | "reject") {
    const evidence_status: EvidenceStatus = action === "approve" ? "admin_reviewed" : "rejected";
    const { error } = await supabase
      .from("food_products")
      .update({ evidence_status, last_reviewed_at: new Date().toISOString() })
      .eq("id", productId);
    if (error) throw error;
    await logAction("product", productId, action);
    await adminReviewService.resolveQueueForEntity("product", productId);
  },

  async listPendingSubmissions() {
    const { data } = await supabase
      .from("ocr_label_submissions")
      .select("id, raw_ocr_text, matched_product_id, created_at")
      .eq("review_status", "pending")
      .order("created_at", { ascending: false });
    return data ?? [];
  },

  async reviewProductSubmission(id: string, action: "approve" | "reject" | "merge", matchedProductId?: string | null) {
    const review_status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "merged";
    const evidence_status: EvidenceStatus = action === "reject" ? "rejected" : "admin_reviewed";
    const { error } = await supabase
      .from("product_submissions")
      .update({ review_status, evidence_status, matched_product_id: matchedProductId ?? null })
      .eq("id", id);
    if (error) throw error;
    await logAction("product_submission", id, action, { matchedProductId });
    await adminReviewService.resolveQueueForEntity("product_submission", id);
  },

  async reviewLabelSubmission(id: string, action: "approve" | "reject" | "merge", matchedProductId?: string | null) {
    const review_status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "merged";
    const evidence_status: EvidenceStatus = action === "reject" ? "rejected" : "admin_reviewed";
    const { error } = await supabase
      .from("ocr_label_submissions")
      .update({ review_status, evidence_status, matched_product_id: matchedProductId ?? null })
      .eq("id", id);
    if (error) throw error;
    await logAction("ocr_label", id, action, { matchedProductId });
    await adminReviewService.resolveQueueForEntity("ocr_label", id);
  },

  /** Mark a lab test's evidence level/status (product-level, brand-level, stale, demo, rejected). */
  async setLabStatus(labTestId: string, evidenceStatus: EvidenceStatus, status?: string) {
    const { error } = await supabase
      .from("lab_tests")
      .update({ evidence_status: evidenceStatus, status: status ?? null, reviewed_by: getUserId(), reviewed_at: new Date().toISOString() })
      .eq("id", labTestId);
    if (error) throw error;
    await logAction("lab_test", labTestId, "set_status", { evidenceStatus, status });
    await adminReviewService.resolveQueueForEntity("lab_test", labTestId);
  },

  /** Attach an unmatched recall to a brand (brand-level match, not an exact product recall). */
  async attachRecallToBrand(recallId: string, brandId: string) {
    const { error } = await supabase
      .from("recall_events")
      .update({ brand_id: brandId, brand_match_level: "brand", last_reviewed_at: new Date().toISOString() })
      .eq("id", recallId);
    if (error) throw error;
    await logAction("recall", recallId, "attach_evidence", { brandId });
  },
};
