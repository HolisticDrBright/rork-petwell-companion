import { getUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";

import { OWNED_TABLES } from "./ownedTables";

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
      const { data, error } = await supabase.from(table).select("*");
      if (error) throw error;
      out[table] = data ?? [];
    }
    return out;
  },

  /** Delete all stored scan images (storage objects + rows). Returns count removed. */
  async deleteScanImages(): Promise<number> {
    const uid = getUserId();
    if (!uid) return 0;
    const { data: scans, error: scanError } = await supabase.from("scan_records").select("id").eq("owner_id", uid);
    if (scanError) throw scanError;
    const scanIds = (scans ?? []).map((s) => s.id);
    if (scanIds.length === 0) return 0;
    const { data: imgs, error: imageError } = await supabase.from("scan_images").select("id, storage_path").in("scan_id", scanIds);
    if (imageError) throw imageError;
    const rows = imgs ?? [];
    const paths = rows.map((i) => i.storage_path).filter(Boolean) as string[];
    if (paths.length) {
      const { error } = await supabase.storage.from("scan-images").remove(paths);
      if (error) throw error;
    }
    if (rows.length) {
      const { error } = await supabase.from("scan_images").delete().in("id", rows.map((i) => i.id));
      if (error) throw error;
    }
    return paths.length;
  },

  /** The authenticated server function removes files and the actual auth user. */
  async deleteAccountData(): Promise<void> {
    if (!getUserId()) throw new Error("Sign in to delete your account.");
    const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
    if (error) throw error;
    if (data?.deleted !== true) throw new Error("The server did not confirm account deletion. Please retry.");
  },
};
