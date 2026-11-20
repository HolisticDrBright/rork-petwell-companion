import { requireUserId } from "@/lib/backend";
import { photoJpeg } from "@/lib/photoUpload";
import { supabase } from "@/lib/supabase";
import { aiService } from "@/services/aiService";
import type { AiEnvelope } from "@/lib/ai/types";
import type { RecordField } from "../../supabase/functions/_shared/record-fields";

export type { RecordField };
export const recordIngestionKey = (id: string) => ["record-ingestions", id];

export const recordIngestionService = {
  async list(petId: string) {
    const { data, error } = await supabase.from("record_ingestions")
      .select("id,image_path,status,extraction,confirmed_fields,created_at")
      .eq("pet_id", petId).in("status", ["pending_review", "confirmed"]).order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async upload(uri: string): Promise<string> {
    const availability = await aiService.availability({ needsDocs: true });
    if (!availability.ok) throw new Error(availability.reason ?? "Enable AI and document processing in Settings.");
    const owner = requireUserId();
    const photo = await photoJpeg(uri, 2400);
    if (owner !== requireUserId()) throw new Error("The signed-in account changed.");
    const path = `${owner}/vet-import-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const { error } = await supabase.storage.from("documents").upload(path, photo, { contentType: "image/jpeg" });
    if (error) throw error;
    return path;
  },

  async extract(petId: string, path: string): Promise<void> {
    const availability = await aiService.availability({ needsDocs: true });
    if (!availability.ok) throw new Error(availability.reason ?? "Document processing is off.");
    const { data, error } = await supabase.functions.invoke<AiEnvelope<{ id: string }>>("ai-record-ingestion", {
      body: { petId, imagePath: path, documentConsent: true },
    });
    if (error || !data?.ok || !data.data) throw new Error(data?.disabledReason ?? data?.error ?? "Couldn’t read the document. Try again.");
  },

  async photo(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },

  async review(id: string, fields: RecordField[], accept: boolean): Promise<void> {
    const { error } = await supabase.rpc("review_record_ingestion", { p_id: id, p_fields: fields, p_accept: accept });
    if (error) throw error;
  },
};
