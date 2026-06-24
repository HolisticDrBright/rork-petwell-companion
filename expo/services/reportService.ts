import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

const asJson = (v: unknown): Json => v as unknown as Json;

export interface ReportRow {
  id: string;
  title: string;
  concern_summary: string | null;
  generated_at: string;
}

export const reportService = {
  /** Persist a vet-ready report snapshot and return its id. */
  async createReport(
    petId: string,
    args: { title?: string; concernSummary?: string; payload: Record<string, unknown> }
  ): Promise<string> {
    const owner_id = requireUserId();
    const { data, error } = await supabase
      .from("vet_reports")
      .insert({
        pet_id: petId,
        owner_id,
        title: args.title ?? "Vet-ready summary",
        concern_summary: args.concernSummary ?? null,
        payload: asJson(args.payload),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  },

  async listReports(petId: string): Promise<ReportRow[]> {
    const { data, error } = await supabase
      .from("vet_reports")
      .select("id, title, concern_summary, generated_at")
      .eq("pet_id", petId)
      .order("generated_at", { ascending: false });
    if (error) throw error;
    return (data as ReportRow[]) ?? [];
  },
};
