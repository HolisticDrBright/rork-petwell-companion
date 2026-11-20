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
  food?: { label: string; productId?: string; foodScanId?: string };
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
    requireUserId();
    const { data, error } = await supabase.rpc("add_timeline_event", { pet_id: petId, entry: { ...entry } });
    if (error) throw error;
    if (!data) throw new Error("The server did not confirm this save. Please try again.");
    return mapEvent(data as EventRow);
  },
};
