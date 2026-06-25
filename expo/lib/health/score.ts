import type { Pet, TimelineEntry } from "@/types/pet";

import { lifeStage } from "@/lib/integrative/safety";

/**
 * Petwell Health Score — a daily/weekly wellbeing snapshot built from the pet's
 * own logs. It is a wellness signal, NOT a diagnosis: every sub-score explains
 * what changed, why it matters, and what to do next, and says plainly when there
 * isn't enough data yet.
 */

export type ScoreBand = "great" | "good" | "watch" | "attention";

export interface SystemSubScore {
  key: string;
  label: string;
  score: number; // 0–100
  band: ScoreBand;
  status: string; // one-line current status
  changed: string; // what changed
  why: string; // why it matters
  next: string; // what to do next
  influencedBy: string[]; // which logs/signals fed this score
  hasData: boolean;
}

export interface PetHealthScore {
  overall: number;
  band: ScoreBand;
  headline: string;
  generatedAt: string;
  systems: SystemSubScore[];
  loggedSignals: number;
}

const SYSTEMS = [
  { key: "digestion", label: "Digestion" },
  { key: "skin", label: "Skin & allergy" },
  { key: "weight", label: "Weight & metabolic" },
  { key: "activity", label: "Activity & mobility" },
  { key: "dental", label: "Dental & oral" },
  { key: "hydration", label: "Hydration & urinary" },
  { key: "stress", label: "Stress & behavior" },
  { key: "senior", label: "Senior & chronic risk" },
] as const;

function bandFor(score: number): ScoreBand {
  if (score >= 85) return "great";
  if (score >= 70) return "good";
  if (score >= 50) return "watch";
  return "attention";
}

function refDate(timeline: TimelineEntry[], todayIso?: string): string {
  const dates = timeline.map((t) => t.date).filter(Boolean).sort();
  return dates[dates.length - 1] ?? todayIso ?? "2026-06-25";
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.abs(Math.round((db - da) / 86_400_000));
}

function recent(timeline: TimelineEntry[], ref: string, days: number): TimelineEntry[] {
  return timeline.filter((t) => daysBetween(t.date, ref) <= days);
}

const has = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
};

function entryText(e: TimelineEntry): string {
  return `${e.title} ${e.detail ?? ""}`.toLowerCase();
}

/** A "needs data" sub-score: honest neutral baseline that asks for a log. */
function needsData(key: string, label: string, next: string): SystemSubScore {
  return {
    key,
    label,
    score: 72,
    band: "good",
    status: "Not enough logs yet",
    changed: "No recent entries to read.",
    why: "More logs let Petwell spot trends earlier.",
    next,
    influencedBy: [],
    hasData: false,
  };
}

function scoreDigestion(tl: TimelineEntry[], ref: string): SystemSubScore {
  const window = recent(tl, ref, 14);
  const stool = window.filter((e) => e.category === "stool" && typeof e.value === "number");
  const vomiting = window.filter((e) => e.category === "symptom" && has(entryText(e), ["vomit", "throw up"]));
  if (stool.length === 0 && vomiting.length === 0) {
    return needsData("digestion", "Digestion", "Log a stool check after the next walk.");
  }
  const latest = stool[0]?.value ?? 6;
  let score = Math.round(Math.min(10, Math.max(0, latest)) * 10);
  score -= vomiting.length * 12;
  score = Math.max(20, Math.min(100, score));
  const trendTxt =
    stool.length >= 2
      ? (stool[0].value ?? 0) >= (stool[stool.length - 1].value ?? 0)
        ? "Stool quality is holding or improving."
        : "Stool quality dipped recently."
      : "One recent stool log on file.";
  return {
    key: "digestion",
    label: "Digestion",
    score,
    band: bandFor(score),
    status: score >= 70 ? "Stable digestion" : "Worth watching",
    changed: vomiting.length ? `${vomiting.length} vomiting note(s) logged.` : trendTxt,
    why: "Stool and appetite are the earliest signs of gut and food issues.",
    next: score >= 70 ? "Keep meals consistent; log any loose stool." : "Consider a gentle Gut Reset plan and track stool daily.",
    influencedBy: [...stool, ...vomiting].slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreSkin(tl: TimelineEntry[], ref: string, pet: Pet): SystemSubScore {
  const window = recent(tl, ref, 21);
  const skin = window.filter((e) => e.category === "skin" && typeof e.value === "number");
  if (skin.length === 0) {
    if (pet.conditions.some((c) => has(c, ["skin", "atop", "allerg", "itch"]))) {
      return {
        key: "skin",
        label: "Skin & allergy",
        score: 64,
        band: "watch",
        status: "On the watch list",
        changed: "Skin is a known concern but isn't being logged.",
        why: "Itch trends reveal flares and food/season triggers.",
        next: "Start a 14-Day Itch Tracker and rate itch 0–10 daily.",
        influencedBy: pet.conditions.filter((c) => has(c, ["skin", "atop", "allerg", "itch"])),
        hasData: false,
      };
    }
    return needsData("skin", "Skin & allergy", "Rate any itching 0–10 to start a baseline.");
  }
  // itch value: higher = worse
  const latestItch = skin[0].value ?? 0;
  const score = Math.max(20, Math.min(100, Math.round((10 - Math.min(10, latestItch)) * 10)));
  const first = skin[skin.length - 1].value ?? latestItch;
  const dir = latestItch < first ? "improving" : latestItch > first ? "rising" : "steady";
  return {
    key: "skin",
    label: "Skin & allergy",
    score,
    band: bandFor(score),
    status: latestItch <= 3 ? "Comfortable skin" : latestItch <= 6 ? "Mild itch" : "Itchy — needs support",
    changed: `Itch is ${dir} (latest ${latestItch}/10).`,
    why: "Persistent itch suggests allergy or skin-barrier issues worth supporting.",
    next: latestItch <= 3 ? "Keep up the current routine." : "Try an Itchy-Skin support plan and review environment triggers.",
    influencedBy: skin.slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreWeight(tl: TimelineEntry[], ref: string, pet: Pet, trends?: Record<string, number[]>): SystemSubScore {
  const weights = recent(tl, ref, 60)
    .filter((e) => e.category === "weight" && typeof e.value === "number")
    .map((e) => e.value as number);
  const series = weights.length >= 2 ? weights : trends?.weight ?? [];
  const obeseFlag = pet.conditions.some((c) => has(c, ["obes", "overweight", "weight"]));
  const diabetesFlag = pet.conditions.some((c) => has(c, ["diabet", "insulin"]));
  if (series.length < 2 && !obeseFlag && !diabetesFlag) {
    return needsData("weight", "Weight & metabolic", "Add a weight every 1–2 weeks to track the trend.");
  }
  const latest = series[0] ?? pet.weightLb;
  const prev = series[series.length - 1] ?? latest;
  const pctChange = prev ? ((latest - prev) / prev) * 100 : 0;
  let score = 82;
  if (Math.abs(pctChange) > 5) score -= 18;
  if (obeseFlag) score -= 16;
  if (diabetesFlag) score -= 10;
  score = Math.max(30, Math.min(100, score));
  const dir = pctChange > 1 ? "up" : pctChange < -1 ? "down" : "steady";
  return {
    key: "weight",
    label: "Weight & metabolic",
    score,
    band: bandFor(score),
    status: obeseFlag ? "Weight management focus" : dir === "steady" ? "Steady weight" : `Trending ${dir}`,
    changed: series.length >= 2 ? `Weight ${dir} ${Math.abs(pctChange).toFixed(1)}% recently.` : "Flagged from the health profile.",
    why: "Weight drives joint, metabolic and longevity risk more than almost anything else.",
    next: obeseFlag
      ? "Open the Weight-Loss / Metabolic plan and measure every meal."
      : dir === "down" && pet.species === "cat"
        ? "Unplanned loss in a cat warrants a vet check."
        : "Keep portions measured and weigh in every 2 weeks.",
    influencedBy: weights.length ? ["Weight logs"] : pet.conditions.filter((c) => has(c, ["obes", "weight", "diabet"])),
    hasData: series.length >= 2 || obeseFlag || diabetesFlag,
  };
}

function scoreActivity(tl: TimelineEntry[], ref: string): SystemSubScore {
  const window = recent(tl, ref, 14);
  const acts = window.filter((e) => e.category === "activity" && typeof e.value === "number");
  const mobility = window.filter((e) => has(entryText(e), ["stiff", "limp", "lame", "slow on stairs"]));
  if (acts.length === 0 && mobility.length === 0) {
    return needsData("activity", "Activity & mobility", "Log a walk or play session to track activity.");
  }
  const avg = acts.length ? acts.reduce((s, e) => s + (e.value ?? 0), 0) / acts.length : 5;
  let score = Math.round(Math.min(10, avg) * 10);
  score -= mobility.length * 12;
  score = Math.max(25, Math.min(100, score));
  return {
    key: "activity",
    label: "Activity & mobility",
    score,
    band: bandFor(score),
    status: mobility.length ? "Some stiffness noted" : score >= 70 ? "Active" : "Could move more",
    changed: mobility.length ? `${mobility.length} mobility note(s) logged.` : `${acts.length} activity log(s) recently.`,
    why: "Regular movement protects joints, weight and mood.",
    next: mobility.length ? "Try an Arthritis Mobility plan and keep movement low-impact." : "Keep daily movement consistent.",
    influencedBy: [...acts, ...mobility].slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreDental(tl: TimelineEntry[], ref: string, pet: Pet): SystemSubScore {
  const window = recent(tl, ref, 60);
  const dental = window.filter(
    (e) => e.category === "vet" && has(entryText(e), ["dental", "teeth", "tartar", "gingivitis"]),
  );
  const oralSigns = window.filter((e) => has(entryText(e), ["bad breath", "drooling", "dropping food", "mouth"]));
  if (dental.length === 0 && oralSigns.length === 0) {
    return {
      key: "dental",
      label: "Dental & oral",
      score: 68,
      band: "watch",
      status: "No dental data",
      changed: "No oral-care logs on file.",
      why: "Dental disease is common, painful and links to organ health.",
      next: "Log brushing or a dental check, and watch for bad breath.",
      influencedBy: [],
      hasData: false,
    };
  }
  const score = oralSigns.length ? 52 : 80;
  return {
    key: "dental",
    label: "Dental & oral",
    score,
    band: bandFor(score),
    status: oralSigns.length ? "Possible oral discomfort" : "Dental care on track",
    changed: oralSigns.length ? `${oralSigns.length} oral sign(s) logged.` : "Recent dental care logged.",
    why: "Oral pain and infection affect eating and whole-body health.",
    next: oralSigns.length ? "Ask your vet about a dental exam; see the Dental Inflammation plan." : "Keep up brushing/dental chews.",
    influencedBy: [...dental, ...oralSigns].slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreHydration(tl: TimelineEntry[], ref: string, pet: Pet): SystemSubScore {
  const window = recent(tl, ref, 21);
  const water = window.filter((e) => has(entryText(e), ["water", "drink", "thirst"]));
  const urinary = window.filter(
    (e) => e.category === "symptom" && has(entryText(e), ["urin", "pee", "litter", "strain"]),
  );
  const kidneyFlag = pet.conditions.some((c) => has(c, ["kidney", "renal", "ckd", "urinary", "bladder"]));
  const moreThirst = water.some((e) => has(entryText(e), ["more", "increased", "extra"]));
  if (water.length === 0 && urinary.length === 0 && !kidneyFlag) {
    return needsData("hydration", "Hydration & urinary", "Note water intake and litter/potty trips.");
  }
  let score = 80;
  if (kidneyFlag) score -= 18;
  if (moreThirst) score -= 12;
  if (urinary.length) score -= 14;
  score = Math.max(30, Math.min(100, score));
  return {
    key: "hydration",
    label: "Hydration & urinary",
    score,
    band: bandFor(score),
    status: kidneyFlag ? "Kidney watch" : moreThirst ? "Drinking more than usual" : "Hydration on track",
    changed: moreThirst ? "Increased thirst noted recently." : urinary.length ? "Urinary signs logged." : "Stable intake.",
    why: "Thirst and urinary changes are early clues for kidney and metabolic health.",
    next:
      pet.species === "cat" && (kidneyFlag || moreThirst)
        ? "Boost wet-food moisture and ask your vet about a kidney check."
        : "Keep fresh water available; track intake.",
    influencedBy: [...water, ...urinary].slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreStress(tl: TimelineEntry[], ref: string): SystemSubScore {
  const window = recent(tl, ref, 21);
  const stress = window.filter((e) =>
    has(entryText(e), ["anxious", "anxiety", "stress", "pacing", "hiding", "panting", "destructive", "vocaliz"]),
  );
  if (stress.length === 0) {
    return needsData("stress", "Stress & behavior", "Note any anxious or stressed moments to track triggers.");
  }
  const score = Math.max(35, 85 - stress.length * 12);
  return {
    key: "stress",
    label: "Stress & behavior",
    score,
    band: bandFor(score),
    status: "Stress signals logged",
    changed: `${stress.length} behavior note(s) recently.`,
    why: "Chronic stress affects appetite, gut health and immunity.",
    next: "Try the Anxiety / Stress support plan and keep a calm routine.",
    influencedBy: stress.slice(0, 4).map((e) => e.title),
    hasData: true,
  };
}

function scoreSenior(pet: Pet): SystemSubScore {
  const stage = lifeStage(pet.species, pet.ageYears);
  const chronicCount = pet.conditions.length;
  if (stage !== "senior" && chronicCount === 0) {
    return {
      key: "senior",
      label: "Senior & chronic risk",
      score: 92,
      band: "great",
      status: "Low age-related risk",
      changed: "No chronic conditions on file.",
      why: "Tracking early gives you a head start as your pet ages.",
      next: "Keep up wellness visits; rescreen yearly.",
      influencedBy: [`${pet.ageYears} yr`],
      hasData: true,
    };
  }
  let score = 84;
  if (stage === "senior") score -= 14;
  score -= Math.min(30, chronicCount * 10);
  score = Math.max(35, Math.min(100, score));
  return {
    key: "senior",
    label: "Senior & chronic risk",
    score,
    band: bandFor(score),
    status: stage === "senior" ? "Senior — proactive care" : "Chronic conditions tracked",
    changed: `${chronicCount} condition(s) on file${stage === "senior" ? `, age ${pet.ageYears}` : ""}.`,
    why: "Seniors and pets with chronic conditions benefit from closer monitoring.",
    next:
      pet.species === "cat" && stage === "senior"
        ? "Consider a Senior Cat Hydration Watch and twice-yearly vet checks."
        : "Use Senior Pet Maintenance and rescheck labs as your vet advises.",
    influencedBy: pet.conditions.length ? pet.conditions : [`${pet.ageYears} yr`],
    hasData: true,
  };
}

export function computeHealthScore(
  pet: Pet,
  timeline: TimelineEntry[],
  trends?: Record<string, number[]>,
  todayIso?: string,
): PetHealthScore {
  const ref = refDate(timeline, todayIso);
  const systems: SystemSubScore[] = [
    scoreDigestion(timeline, ref),
    scoreSkin(timeline, ref, pet),
    scoreWeight(timeline, ref, pet, trends),
    scoreActivity(timeline, ref),
    scoreDental(timeline, ref, pet),
    scoreHydration(timeline, ref, pet),
    scoreStress(timeline, ref),
    scoreSenior(pet),
  ];
  // Overall weights data-backed systems more heavily so the score reflects real signals.
  let weightSum = 0;
  let acc = 0;
  for (const s of systems) {
    const w = s.hasData ? 1 : 0.5;
    acc += s.score * w;
    weightSum += w;
  }
  const overall = Math.round(acc / weightSum);
  const band = bandFor(overall);
  const loggedSignals = systems.filter((s) => s.hasData).length;
  const lowest = [...systems].sort((a, b) => a.score - b.score)[0];
  const headline =
    band === "great"
      ? `${pet.name} is doing great across the board.`
      : band === "good"
        ? `${pet.name} is doing well — one or two areas to watch.`
        : `A few areas need attention — start with ${lowest.label.toLowerCase()}.`;
  return {
    overall,
    band,
    headline,
    generatedAt: ref,
    systems,
    loggedSignals,
  };
}

export const SCORE_BAND_LABEL: Record<ScoreBand, string> = {
  great: "Great",
  good: "Good",
  watch: "Watch",
  attention: "Needs attention",
};

export { SYSTEMS as HEALTH_SYSTEMS };
