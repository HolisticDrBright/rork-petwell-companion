import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { Json } from "@/types/db";

import { petsService } from "./petsService";
import { scanService, type ScanRecordRow } from "./scanService";
import { triageService } from "./triageService";

const asJson = (v: unknown): Json => v as unknown as Json;

export interface GatheredReport {
  medications: { id: string; name: string; purpose: string | null; status: string | null; refillDate: string | null }[];
  scans: ScanRecordRow[];
  triage: Awaited<ReturnType<typeof triageService.getLatest>>;
}

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

  /** Pull the stored pieces the vet report compiles (best-effort each). */
  async gather(petId: string): Promise<GatheredReport> {
    const [medications, scans, triage] = await Promise.all([
      petsService.getMedications(petId).catch(() => []),
      scanService.listScans(petId).catch(() => []),
      triageService.getLatest(petId).catch(() => null),
    ]);
    return { medications, scans, triage };
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
