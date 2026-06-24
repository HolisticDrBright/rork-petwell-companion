import { supabase } from "@/lib/supabase";
import type { Reminder } from "@/types/pet";

type ReminderRow = {
  id: string;
  label: string;
  detail: string | null;
  time_label: string | null;
  repeat: string | null;
  enabled: boolean;
};

function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    label: row.label,
    detail: row.detail ?? "",
    time: row.time_label ?? "",
    repeat: row.repeat ?? "Once",
    enabled: row.enabled,
  };
}

export interface NewReminder {
  label: string;
  detail?: string;
  time?: string;
  repeat?: string;
  enabled?: boolean;
}

export const remindersService = {
  async listReminders(petId: string): Promise<Reminder[]> {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("pet_id", petId)
      .order("sort", { ascending: true });
    if (error) throw error;
    return (data as ReminderRow[]).map(mapReminder);
  },

  async setEnabled(reminderId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase.from("reminders").update({ enabled }).eq("id", reminderId);
    if (error) throw error;
  },

  async createReminder(petId: string, input: NewReminder): Promise<Reminder> {
    const { data, error } = await supabase
      .from("reminders")
      .insert({
        pet_id: petId,
        label: input.label,
        detail: input.detail ?? null,
        time_label: input.time ?? null,
        repeat: input.repeat ?? "Once",
        enabled: input.enabled ?? true,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapReminder(data as ReminderRow);
  },
};
