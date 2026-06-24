import type { ScanResult } from "@/constants/scans";
import { getUserId, requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

export interface ScanRecordRow {
  id: string;
  scan_type: string;
  score: string | null;
  score_label: string | null;
  urgency: string | null;
  correlation: string | null;
  notes: string | null;
  created_at: string;
}

export const scanService = {
  /** Persist a completed scan and return its id. */
  async createScan(
    petId: string,
    args: { scanType: string; result: ScanResult; notes?: string }
  ): Promise<string> {
    const owner_id = requireUserId();
    const { result } = args;
    const { data, error } = await supabase
      .from("scan_records")
      .insert({
        pet_id: petId,
        owner_id,
        scan_type: args.scanType,
        status: "complete",
        score: result.score ?? null,
        score_label: result.scoreLabel ?? null,
        urgency: result.urgency,
        fields: asJson(result.fields),
        patterns: asJson(result.patterns),
        follow_ups: asJson(result.followUps),
        correlation: result.correlation ?? null,
        notes: args.notes ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  /** Manual scan correction — the owner fixes anything the photo read wrong. */
  async saveCorrection(input: { scanType: string; note: string; scanId?: string }): Promise<void> {
    const owner_id = getUserId();
    if (!owner_id) return;
    await supabase.from("user_corrections").insert({
      owner_id,
      entity_type: "scan",
      entity_id: input.scanId ?? null,
      field: input.scanType,
      note: input.note,
    });
  },

  async listScans(petId: string): Promise<ScanRecordRow[]> {
    const { data, error } = await supabase
      .from("scan_records")
      .select("id, scan_type, score, score_label, urgency, correlation, notes, created_at")
      .eq("pet_id", petId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as ScanRecordRow[]) ?? [];
  },

  /**
   * Best-effort upload of a local image (file://, content://, or blob URL) to
   * the scan-images bucket under the user's folder, then link it to a scan.
   * Returns the storage path, or null if the upload could not be completed.
   */
  async uploadScanImage(scanId: string, localUri: string): Promise<string | null> {
    try {
      const owner_id = requireUserId();
      const res = await fetch(localUri);
      const bytes = await res.arrayBuffer();
      const ext = localUri.split(".").pop()?.split("?")[0] || "jpg";
      const path = `${owner_id}/${scanId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("scan-images")
        .upload(path, bytes, { contentType: `image/${ext}`, upsert: true });
      if (error) throw error;
      await supabase.from("scan_images").insert({ scan_id: scanId, storage_path: path });
      return path;
    } catch (e) {
      console.warn("[petwell] scan image upload skipped:", e);
      return null;
    }
  },
};
