import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

/**
 * Stores a user's OCR/label submission as `crowdsourced_unverified` + `pending`
 * review — it is NEVER treated as verified product data until an admin reviews
 * it. Owner-scoped (no-op in local mode).
 */
export const labelSubmissionService = {
  async submit(input: {
    petId?: string | null;
    rawText?: string;
    cleanedText?: string;
    ingredients?: string[];
    guaranteedAnalysis?: Record<string, number | undefined>;
    imagePath?: string | null;
    matchedProductId?: string | null;
    matchConfidence?: string | null;
  }): Promise<{ id: string | null }> {
    const owner_id = getUserId();
    if (!owner_id) return { id: null };
    const { data, error } = await supabase
      .from("ocr_label_submissions")
      .insert({
        owner_id,
        pet_id: input.petId ?? null,
        raw_ocr_text: input.rawText ?? null,
        cleaned_text: input.cleanedText ?? null,
        parsed_ingredients: input.ingredients ?? null,
        guaranteed_analysis: asJson(input.guaranteedAnalysis ?? {}),
        image_path: input.imagePath ?? null,
        matched_product_id: input.matchedProductId ?? null,
        match_confidence: input.matchConfidence ?? null,
        evidence_status: "crowdsourced_unverified",
        review_status: "pending",
      })
      .select("id")
      .maybeSingle();
    if (error) throw error;
    return { id: data?.id ?? null };
  },

  /** A user's own submissions (for a "my submissions" view). */
  async listMine(): Promise<{ id: string; review_status: string; created_at: string }[]> {
    const owner_id = getUserId();
    if (!owner_id) return [];
    const { data } = await supabase
      .from("ocr_label_submissions")
      .select("id, review_status, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  },
};
