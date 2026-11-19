import type { TimelineEntry } from "@/types/pet";

/** Every point comes from an observation; a profile weight is not a series. */
export function trendsFromLogs(logs: TimelineEntry[]): Record<string, number[]> {
  const out: Record<string, number[]> = { appetite: [], stool: [], itching: [], activity: [], weight: [] };
  for (const entry of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = entry.category === "skin" ? "itching" : entry.category;
    if (key in out && typeof entry.value === "number" && Number.isFinite(entry.value)) out[key].push(entry.value);
  }
  return out;
}
