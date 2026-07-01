import type { UrgencyKey } from "@/constants/colors";
import { requireUserId } from "@/lib/backend";
import { supabase } from "@/lib/supabase";
import type { LogCategory, TimelineEntry } from "@/types/pet";

type EventRow = {
  id: string;
  pet_id: string;
  category: string;
  title: string;
  detail: string | null;
  value: number | null;
  urgency: string | null;
  event_date: string;
  event_time: string | null;
  image_path?: string | null;
};

function mapEvent(row: EventRow): TimelineEntry {
  return {
    id: row.id,
    petId: row.pet_id,
    date: row.event_date,
    time: row.event_time ?? "",
    category: row.category as LogCategory,
    title: row.title,
    detail: row.detail ?? undefined,
    imagePath: row.image_path ?? undefined,
    value: row.value ?? undefined,
    urgency: (row.urgency as UrgencyKey) ?? undefined,
  };
}

// Categories that carry a chartable numeric value also get a health_logs row.
const METRIC_CATEGORIES = new Set<LogCategory>(["stool", "skin", "weight", "activity"]);

export interface NewTimelineEntry {
  category: LogCategory;
  title: string;
  detail?: string;
  value?: number;
  urgency?: UrgencyKey;
  date: string;
  time: string;
  source?: string;
  refId?: string;
  imagePath?: string;
}

export const timelineService = {
  async listEvents(petId: string, limit = 500): Promise<TimelineEntry[]> {
    // Cap at the most recent N events: the timeline, health score, and pattern
    // detectors all walk this list, so it must stay bounded as history grows.
    const { data, error } = await supabase
      .from("timeline_events")
      .select("*")
      .eq("pet_id", petId)
      .order("event_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as EventRow[]).map(mapEvent);
  },

  async addEvent(petId: string, entry: NewTimelineEntry): Promise<TimelineEntry> {
    const owner_id = requireUserId();
    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        pet_id: petId,
        owner_id,
        category: entry.category,
        title: entry.title,
        detail: entry.detail ?? null,
        value: entry.value ?? null,
        urgency: entry.urgency ?? null,
        event_date: entry.date,
        event_time: entry.time,
        source: entry.source ?? "manual",
        ref_id: entry.refId ?? null,
        image_path: entry.imagePath ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;

    // Mirror chartable metrics into health_logs.
    if (entry.value != null && METRIC_CATEGORIES.has(entry.category)) {
      await supabase.from("health_logs").insert({
        pet_id: petId,
        owner_id,
        category: entry.category,
        value: entry.value,
        note: entry.detail ?? null,
      });
    }
    return mapEvent(data as EventRow);
  },
};
