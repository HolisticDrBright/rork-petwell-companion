import { photoJpeg } from "@/lib/photoUpload";
import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { RecordItem } from "@/types/pet";

// Display order for the Records screen sections.
export const RECORD_CATEGORIES = [
  "Vaccines",
  "Medications",
  "Conditions",
  "Allergies",
  "Vet visits",
  "Lab results",
  "Documents",
  "Insurance",
  "Microchip",
  "Emergency contacts",
] as const;

type RecordRow = {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  record_date: string | null;
  status: string | null;
};

function mapRecord(row: RecordRow): RecordItem {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    date: row.record_date ?? "",
    status: (row.status as RecordItem["status"]) ?? undefined,
  };
}

export interface NewRecord {
  category: string;
  title: string;
  subtitle?: string;
  date?: string;
  status?: RecordItem["status"];
}

export const recordsService = {
  /** Returns records grouped by category in a stable display order. */
  async listRecords(petId: string): Promise<Record<string, RecordItem[]>> {
    const { data, error } = await supabase
      .from("vet_records")
      .select("*")
      .eq("pet_id", petId)
      .order("sort", { ascending: true })
      .limit(1000);
    if (error) throw error;

    const grouped: Record<string, RecordItem[]> = {};
    for (const category of RECORD_CATEGORIES) grouped[category] = [];
    (data as RecordRow[]).forEach((row) => {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(mapRecord(row));
    });
    return grouped;
  },

  async addRecord(petId: string, input: NewRecord): Promise<RecordItem> {
    const owner_id = requireUserId();
    const { data, error } = await supabase
      .from("vet_records")
      .insert({
        pet_id: petId,
        owner_id,
        category: input.category,
        title: input.title,
        subtitle: input.subtitle ?? null,
        record_date: input.date ?? null,
        status: input.status ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapRecord(data as RecordRow);
  },

  /** Store a private photo and atomically link it to Records. */
  async uploadDocument(petId: string, localUri: string, title: string): Promise<string> {
    const userId = requireUserId();
    const bytes = await photoJpeg(localUri, 2400);
    const path = `${userId}/${petId}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage.from("documents")
      .upload(path, bytes, { contentType: "image/jpeg" });
    if (uploadError) throw uploadError;
    const { error: attachError, status } = await supabase.rpc("attach_vet_document", {
      p_pet_id: petId, p_path: path, p_title: title.trim().slice(0, 200), p_size: bytes.byteLength,
    });
    if (attachError) {
      // On a lost response the database may already have linked the photo.
      if (status >= 400 && status < 500) await supabase.storage.from("documents").remove([path]);
      throw attachError;
    }
    return path;
  },
};
