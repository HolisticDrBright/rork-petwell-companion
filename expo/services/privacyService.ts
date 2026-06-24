import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";

/**
 * Data-ownership workflows. These back the Settings privacy screen: export your
 * data, delete stored photos, delete your account data, and manage permissions
 * (training opt-out, photo storage, personalized insights, research sharing).
 * Everything here operates only on the signed-in user's own rows (RLS-enforced).
 */

export type PrivacyKey = "training_opt_out" | "store_photos" | "personalized_insights" | "share_research";

export interface PrivacyPrefs {
  training_opt_out: boolean;
  store_photos: boolean;
  personalized_insights: boolean;
  share_research: boolean;
}

export const DEFAULT_PRIVACY: PrivacyPrefs = {
  training_opt_out: false,
  store_photos: true,
  personalized_insights: true,
  share_research: false,
};

// User-owned tables that make up "all my data" (catalog/reference tables excluded).
const OWNED_TABLES = [
  "pet_profiles",
  "pet_conditions",
  "pet_allergies",
  "pet_medications",
  "care_tasks",
  "reminders",
  "timeline_events",
  "health_logs",
  "symptom_sessions",
  "symptom_answers",
  "triage_results",
  "scan_records",
  "scan_images",
  "vet_records",
  "document_uploads",
  "vet_reports",
  "food_scans",
  "food_logs",
  "food_scores",
  "food_recommendations",
  "user_corrections",
] as const;

export const privacyService = {
  async getPrefs(): Promise<PrivacyPrefs> {
    const uid = getUserId();
    if (!uid) return DEFAULT_PRIVACY;
    const { data, error } = await supabase
      .from("profiles")
      .select("training_opt_out, store_photos, personalized_insights, share_research")
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return data ?? DEFAULT_PRIVACY;
  },

  async setPref(key: PrivacyKey, value: boolean): Promise<void> {
    const uid = getUserId();
    if (!uid) return;
    const patch: Partial<Record<PrivacyKey, boolean>> = { [key]: value };
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid);
    if (error) throw error;
  },

  /** Export every owned row as a single JSON object. Always free. */
  async exportAll(): Promise<Record<string, unknown>> {
    const uid = getUserId();
    const out: Record<string, unknown> = {
      app: "Petwell",
      exportedAt: new Date().toISOString(),
      userId: uid ?? null,
    };
    if (!uid) return out;
    for (const table of OWNED_TABLES) {
      const { data } = await supabase.from(table).select("*");
      out[table] = data ?? [];
    }
    return out;
  },

  /** Delete all stored scan images (storage objects + rows). Returns count removed. */
  async deleteScanImages(): Promise<number> {
    const uid = getUserId();
    if (!uid) return 0;
    const { data: scans } = await supabase.from("scan_records").select("id").eq("owner_id", uid);
    const scanIds = (scans ?? []).map((s) => s.id);
    if (scanIds.length === 0) return 0;
    const { data: imgs } = await supabase.from("scan_images").select("id, storage_path").in("scan_id", scanIds);
    const rows = imgs ?? [];
    const paths = rows.map((i) => i.storage_path).filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("scan-images").remove(paths);
    if (rows.length) await supabase.from("scan_images").delete().in("id", rows.map((i) => i.id));
    return paths.length;
  },

  /**
   * Delete the user's pet + activity data and their profile row, then sign out.
   * Pet-scoped rows cascade from pet_profiles; owner-scoped rows cascade from
   * profiles. (The auth user record itself is removed server-side on request.)
   */
  async deleteAccountData(): Promise<void> {
    const uid = getUserId();
    if (!uid) return;
    await supabase.from("pet_profiles").delete().eq("owner_id", uid);
    await supabase.from("vet_reports").delete().eq("owner_id", uid);
    await supabase.from("food_scans").delete().eq("owner_id", uid);
    await supabase.from("profiles").delete().eq("id", uid);
    await supabase.auth.signOut();
  },
};
