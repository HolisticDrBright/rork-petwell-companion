import { getUserId, requireUserId } from "@/lib/backend";
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

async function listPhotoPaths(
  bucket: "scan-images" | "documents",
  directory: string,
  prefix?: string,
): Promise<string[]> {
  const paths: string[] = [];
  const size = 100;
  for (let offset = 0; ; offset += size) {
    const { data, error } = await supabase.storage.from(bucket).list(directory, {
      limit: size,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    for (const entry of data) {
      if (entry.name.includes("/") || entry.name === "." || entry.name === "..") continue;
      const path = `${directory}/${entry.name}`;
      if (!entry.id && !prefix) paths.push(...await listPhotoPaths(bucket, path));
      else if (entry.id && (!prefix || entry.name.startsWith(prefix))) paths.push(path);
    }
    if (data.length < size) return paths;
  }
}

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
    const uid = requireUserId();
    const patch: Partial<Record<PrivacyKey, boolean>> = { [key]: value };
    const { error } = await supabase.from("profiles").update(patch).eq("id", uid).select("id").single();
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
      const entries: unknown[] = [];
      const size = 500;
      for (let offset = 0; ; offset += size) {
        const { data, error } = await supabase.from(table).select("*").order("id").range(offset, offset + size - 1);
        if (error) throw error;
        entries.push(...data);
        if (data.length < size) break;
      }
      out[table] = entries;
    }
    return out;
  },

  /** Delete all stored scan images (storage objects + rows). Returns count removed. */
  async deleteScanImages(): Promise<number> {
    const uid = requireUserId();
    const buckets = ["scan-images", "documents"] as const;
    const [scans, documents] = await Promise.all([
      listPhotoPaths("scan-images", uid),
      listPhotoPaths("documents", uid, "ai-scan-"),
    ]);
    const pathsByBucket = { "scan-images": scans, documents };
    for (const bucket of buckets) {
      const paths = pathsByBucket[bucket];
      for (let offset = 0; offset < paths.length; offset += 100) {
        const { error } = await supabase.storage.from(bucket).remove(paths.slice(offset, offset + 100));
        if (error) throw error;
      }
    }

    const [oldScanLinks, timelineLinks, foodLinks] = await Promise.all([
      supabase.from("scan_images").delete().like("storage_path", `${uid}/%`),
      supabase.from("timeline_events").update({ image_path: null }).eq("owner_id", uid).like("image_path", `${uid}/ai-scan-%`),
      supabase.from("food_scans").update({ image_path: null }).eq("owner_id", uid).like("image_path", `${uid}/ai-scan-%`),
    ]);
    const error = oldScanLinks.error ?? timelineLinks.error ?? foodLinks.error;
    if (error) throw error;
    return scans.length + documents.length;
  },

  /** The authenticated server function removes files and the actual auth user. */
  async deleteAccountData(): Promise<void> {
    if (!getUserId()) throw new Error("Sign in to delete your account.");
    const { data, error } = await supabase.functions.invoke("delete-account", { body: { confirmation: "DELETE" } });
    if (error) throw error;
    if (data?.deleted !== true) throw new Error("The server did not confirm account deletion. Please retry.");
  },
};
