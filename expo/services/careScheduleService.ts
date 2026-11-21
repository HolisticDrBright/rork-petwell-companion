import { supabase } from "@/lib/supabase";
import { requireUserId } from "@/lib/backend";
import type { Database, Tables } from "@/types/db";

export { SCHEDULE_KINDS, RECURRENCES, SCHEDULE_TEMPLATES } from "@/lib/careScheduleRules";

export type CareSchedule = Tables<"care_schedules">;
export type CareOccurrence = Database["public"]["Functions"]["list_care_schedule_occurrences"]["Returns"][number];
export type ScheduleDraft = Pick<CareSchedule, "kind" | "title" | "instructions" | "rrule" | "start_local" | "timezone" | "active" | "dose_portion">;
export const scheduleKey = (petId: string) => ["care-schedules", petId] as const;

export function localDateLabel(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function occurrenceRange(days: number): [Date, Date] {
  const after = new Date();
  after.setHours(0, 0, 0, 0);
  const before = new Date(after);
  before.setDate(before.getDate() + days);
  return [after, before];
}

export const careScheduleService = {
  async list(petId: string): Promise<CareSchedule[]> {
    const { data, error } = await supabase.from("care_schedules").select("*")
      .eq("pet_id", petId).eq("created_by", requireUserId()).is("effective_until", null).order("title");
    if (error) throw error;
    return data;
  },

  async save(petId: string, draft: ScheduleDraft, previous?: string): Promise<string> {
    const { data, error } = await supabase.rpc("save_care_schedule", { p_pet_id: petId, p_fields: draft, p_previous: previous });
    if (error) throw error;
    return data;
  },

  async occurrences(petId: string, after: Date, before: Date): Promise<CareOccurrence[]> {
    const { data, error } = await supabase.rpc("list_care_schedule_occurrences", {
      p_pet_id: petId, p_after: after.toISOString(), p_before: before.toISOString(),
    });
    if (error) throw error;
    return data;
  },

  async complete(item: CareOccurrence): Promise<void> {
    const { error } = await supabase.rpc("complete_care_schedule", {
      p_schedule_id: item.schedule_id, p_scheduled_at: item.scheduled_at,
    });
    if (error) throw error;
  },
};
