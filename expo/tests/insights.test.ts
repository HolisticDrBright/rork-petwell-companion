/**
 * Weekly digest + streak tests — honest arithmetic only. The digest counts and
 * averages what was logged; it never diagnoses or invents improvement claims.
 *
 * Run: bun tests/insights.test.ts
 */
import { computeLogStreak, computeWeeklyDigest } from "../lib/insights/weekly";
import type { TimelineEntry } from "../types/pet";

let pass = 0,
  fail = 0;
const ck = (n: string, c: boolean, x = "") => {
  if (c) pass++;
  else fail++;
  console.log(`${c ? "PASS" : "FAIL"} ${n}${x ? " — " + x : ""}`);
};

const e = (date: string, category = "food", value?: number): TimelineEntry => ({
  id: `${date}-${category}-${Math.floor((value ?? 0) * 10)}`,
  petId: "p1",
  date,
  time: "9:00a",
  category: category as TimelineEntry["category"],
  title: `${category} log`,
  value,
});

const TODAY = "2026-07-01";

// ── 1. Streak ────────────────────────────────────────────────────────────────
ck("1 empty timeline => streak 0", computeLogStreak([], TODAY) === 0);
ck("1 single log today => 1", computeLogStreak([e(TODAY)], TODAY) === 1);
ck("1 three consecutive days => 3", computeLogStreak([e("2026-06-29"), e("2026-06-30"), e(TODAY)], TODAY) === 3);
ck("1 gap breaks the streak", computeLogStreak([e("2026-06-27"), e("2026-06-30"), e(TODAY)], TODAY) === 2);
ck("1 yesterday-grace: no log yet today keeps streak", computeLogStreak([e("2026-06-29"), e("2026-06-30")], TODAY) === 2);
ck("1 two-day-old logs => 0 (streak broken)", computeLogStreak([e("2026-06-28"), e("2026-06-29")], TODAY) === 0);

// ── 2. Digest counts + categories ────────────────────────────────────────────
const week = [e(TODAY, "food"), e(TODAY, "skin", 4), e("2026-06-28", "food"), e("2026-06-26", "activity")];
const prev = [e("2026-06-20", "food"), e("2026-06-21", "skin", 6), e("2026-06-22", "food")];
const d = computeWeeklyDigest([...week, ...prev], TODAY, "Buddy");
ck("2 week/prev counts", d.weekCount === 4 && d.prevWeekCount === 3);
ck("2 active days", d.activeDays === 3);
ck("2 top category is food", d.topCategories[0]?.category === "food" && d.topCategories[0]?.count === 2);
ck("2 headline is factual (mentions count + pet)", /4 logs for Buddy/.test(d.headline));

// ── 3. Value deltas are factual averages, honestly phrased ──────────────────
ck("3 skin value delta computed (4 vs 6)", d.valueDeltas.some((v) => v.category === "skin" && v.thisWeek === 4 && v.lastWeek === 6));
const text = [d.headline, ...d.lines].join(" ");
ck("3 lines say 'Logged … averaged', never a clinical claim", /Logged skin averaged 4 this week vs 6 last week/.test(text));
ck("3 no diagnosis/improvement claims", !/\b(improv|better|worse|healed|diagnos|cured)\b/i.test(text));

// ── 4. Empty week nudges gently ──────────────────────────────────────────────
const empty = computeWeeklyDigest(prev, TODAY, "Luna");
ck("4 empty week headline honest", /No logs for Luna/.test(empty.headline));
ck("4 empty week includes a gentle nudge", empty.lines.some((l) => /quick food or symptom log/i.test(l)));
ck("4 no fabricated deltas on empty week", empty.valueDeltas.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
