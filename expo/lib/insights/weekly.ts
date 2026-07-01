/**
 * Weekly digest + logging streak — pure, honest arithmetic over the timeline.
 * Everything here is a COUNT or AVERAGE of what the owner logged; it never
 * interprets, diagnoses, or claims improvement beyond the logged numbers.
 */
import type { TimelineEntry } from "@/types/pet";

export interface WeeklyDigest {
  /** Consecutive days (ending today or yesterday) with at least one log. */
  streakDays: number;
  /** Entries in the last 7 days (including today). */
  weekCount: number;
  /** Entries in the 7 days before that. */
  prevWeekCount: number;
  /** Distinct days logged in the last 7. */
  activeDays: number;
  /** Top categories this week, most-logged first. */
  topCategories: { category: string; count: number }[];
  /** Per-category average of numeric values this week vs last (only when both exist). */
  valueDeltas: { category: string; thisWeek: number; lastWeek: number }[];
  /** Friendly, factual headline. */
  headline: string;
  lines: string[];
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Consecutive logged days ending today (or yesterday, so a morning check-in
 *  doesn't read as a broken streak before the first log of the day). */
export function computeLogStreak(timeline: TimelineEntry[], todayIso: string): number {
  const days = new Set(timeline.map((t) => t.date));
  let start = todayIso;
  if (!days.has(start)) {
    start = addDays(todayIso, -1);
    if (!days.has(start)) return 0;
  }
  let streak = 0;
  let cursor = start;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function computeWeeklyDigest(timeline: TimelineEntry[], todayIso: string, petName: string): WeeklyDigest {
  const weekStart = addDays(todayIso, -6);
  const prevStart = addDays(todayIso, -13);
  const inWeek = timeline.filter((t) => t.date >= weekStart && t.date <= todayIso);
  const inPrev = timeline.filter((t) => t.date >= prevStart && t.date < weekStart);

  const byCat = new Map<string, number>();
  for (const t of inWeek) byCat.set(t.category, (byCat.get(t.category) ?? 0) + 1);
  const topCategories = [...byCat.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  const avg = (entries: TimelineEntry[], cat: string): number | null => {
    const vals = entries.filter((t) => t.category === cat && typeof t.value === "number").map((t) => t.value as number);
    if (vals.length === 0) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };
  const valueDeltas: WeeklyDigest["valueDeltas"] = [];
  for (const cat of new Set([...inWeek, ...inPrev].map((t) => t.category))) {
    const now = avg(inWeek, cat);
    const before = avg(inPrev, cat);
    if (now !== null && before !== null && now !== before) valueDeltas.push({ category: cat, thisWeek: now, lastWeek: before });
  }

  const streakDays = computeLogStreak(timeline, todayIso);
  const activeDays = new Set(inWeek.map((t) => t.date)).size;

  const headline =
    inWeek.length === 0
      ? `No logs for ${petName} this week yet`
      : `${inWeek.length} log${inWeek.length === 1 ? "" : "s"} for ${petName} across ${activeDays} day${activeDays === 1 ? "" : "s"}`;

  const lines: string[] = [];
  if (streakDays >= 2) lines.push(`${streakDays}-day logging streak — consistency is what makes patterns visible.`);
  if (topCategories.length > 0) lines.push(`Most logged: ${topCategories.map((c) => `${c.category} (${c.count})`).join(", ")}.`);
  for (const d of valueDeltas.slice(0, 2)) {
    lines.push(`Logged ${d.category} averaged ${d.thisWeek} this week vs ${d.lastWeek} last week.`);
  }
  if (inWeek.length > 0 && inPrev.length > 0 && inWeek.length !== inPrev.length) {
    lines.push(`${inWeek.length > inPrev.length ? "More" : "Fewer"} entries than last week (${inWeek.length} vs ${inPrev.length}).`);
  }
  if (inWeek.length === 0) lines.push("A quick food or symptom log keeps the timeline useful for your vet.");

  return { streakDays, weekCount: inWeek.length, prevWeekCount: inPrev.length, activeDays, topCategories, valueDeltas, headline, lines };
}
