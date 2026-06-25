import type { EvidenceGrade } from "./types";

/**
 * Guided Progress Programs — short, structured plans (7/14/30-day and longer)
 * that turn a support protocol into daily tasks the owner can log. Each program
 * is honest about when to STOP and call a vet, and can be summarized and added
 * to the vet-ready report.
 */

export interface ProgramTemplate {
  id: string;
  title: string;
  days: number;
  system: string;
  conditionId?: string;
  species: "dog" | "cat" | "both";
  who: string;
  summary: string;
  dailyTasks: string[];
  whatToLog: string[];
  reminders: string[];
  stopAndCallVet: string[];
  completionHint: string;
  evidence: EvidenceGrade;
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: "stool_reset_7",
    title: "7-Day Stool Reset",
    days: 7,
    system: "gut",
    conditionId: "chronic_diarrhea",
    species: "both",
    who: "Pets with mild, non-emergency loose stool (vet-cleared).",
    summary: "A short, gentle gut-reset to firm up stool and then transition back to the normal diet.",
    dailyTasks: [
      "Feed the bland/gentle diet in small, frequent meals",
      "Add a little plain pumpkin if advised",
      "Offer fresh water and watch hydration",
      "Score today's stool (1–5)",
    ],
    whatToLog: ["Stool score and frequency", "Food and any treats", "Water intake", "Energy and appetite"],
    reminders: ["Meal + stool check (morning)", "Meal + stool check (evening)"],
    stopAndCallVet: [
      "Blood or black/tarry stool, or repeated vomiting",
      "Diarrhea continuing past 48–72 hours",
      "Any lethargy, weakness, or weight loss",
    ],
    completionHint: "If stool firmed up by day 5–7, transition back to the normal diet over another 5–7 days.",
    evidence: "B",
  },
  {
    id: "itch_tracker_14",
    title: "14-Day Itch Tracker",
    days: 14,
    system: "skin",
    conditionId: "itchy_skin",
    species: "both",
    who: "Itchy pets, to build a clear itch baseline and spot triggers.",
    summary: "Two weeks of daily itch scoring plus environment tweaks to reveal what drives flares.",
    dailyTasks: [
      "Rate itch 0–10",
      "Wipe paws/coat after walks",
      "Note foods, treats, and any new products",
      "Photograph any flares",
    ],
    whatToLog: ["Daily itch score", "Affected areas + photos", "Foods/treats", "Flare timing vs season/walks"],
    reminders: ["Evening itch score + paw wipe"],
    stopAndCallVet: [
      "Facial swelling, hives, or breathing trouble (urgent)",
      "Open, spreading, or oozing sores; ear pain",
      "No improvement after diet and environment changes",
    ],
    completionHint: "Review the 14-day itch trend with your vet — steady, season, or food-linked patterns guide the next step.",
    evidence: "A",
  },
  {
    id: "weight_tuneup_30",
    title: "30-Day Weight Tune-Up",
    days: 30,
    system: "metabolic",
    conditionId: "obesity_metabolic",
    species: "both",
    who: "Overweight pets cleared by a vet for measured weight loss.",
    summary: "A month of measured meals, smarter treats, and gentle activity to kick-start healthy loss.",
    dailyTasks: [
      "Measure every meal to the calorie target",
      "Keep treats within the daily budget",
      "Add gentle activity (walk or play)",
      "Log treats and activity",
    ],
    whatToLog: ["Weekly weight", "Daily food + treat calories", "Activity minutes", "Body condition"],
    reminders: ["Weigh-in (weekly)", "Measure meals (daily)"],
    stopAndCallVet: [
      "Excess thirst/urination with weight change (possible diabetes)",
      "Weakness or exercise intolerance",
      "No loss after 30 days of consistent calories (recheck plan)",
    ],
    completionHint: "Aim for ~1–2% body-weight loss per week (slower for cats). Share the trend with your vet to set the next target.",
    evidence: "A",
  },
  {
    id: "senior_cat_hydration_14",
    title: "Senior Cat Hydration Watch",
    days: 14,
    system: "renal",
    conditionId: "kidney_hydration",
    species: "cat",
    who: "Senior cats, to support hydration and catch kidney/thyroid clues early.",
    summary: "Two weeks of boosting moisture and tracking water, appetite, and litter output.",
    dailyTasks: [
      "Add water/low-sodium broth to wet food",
      "Refresh all water stations",
      "Note water intake and litter-box output",
      "Weigh-in (every few days)",
    ],
    whatToLog: ["Water intake", "Appetite", "Litter output / any straining", "Weight"],
    reminders: ["Add moisture to meals", "Refresh water stations"],
    stopAndCallVet: [
      "Straining or unable to urinate (emergency in a male cat)",
      "Not eating, vomiting, or marked lethargy",
      "Rapid weight loss",
    ],
    completionHint: "Bring the 2-week intake/appetite/weight trend to your vet and ask about a senior kidney + thyroid panel.",
    evidence: "B",
  },
  {
    id: "pancreatitis_recovery_14",
    title: "Pancreatitis Recovery Support",
    days: 14,
    system: "hepatic",
    conditionId: "pancreatitis",
    species: "both",
    who: "Dogs recovering from a vet-confirmed pancreatitis episode (post-acute).",
    summary: "Two weeks of strict low-fat feeding and close symptom tracking to support recovery and prevent relapse.",
    dailyTasks: [
      "Feed the low-fat plan in small, frequent meals",
      "Absolutely no fatty treats or table scraps",
      "Watch for vomiting or belly discomfort",
      "Log appetite, stool, and energy",
    ],
    whatToLog: ["Appetite and each meal", "Vomiting episodes", "Stool consistency", "Energy and weight"],
    reminders: ["Low-fat meal (small, frequent)", "Symptom check (evening)"],
    stopAndCallVet: [
      "Repeated vomiting, belly pain, or not eating → vet now",
      "Yellow gums/eyes, collapse, or weakness",
      "Any relapse after improving",
    ],
    completionHint: "Keep fat strictly controlled even after recovery — relapse often follows a high-fat meal. Review progress with your vet.",
    evidence: "B",
  },
  {
    id: "allergy_elimination_56",
    title: "Allergy Elimination Trial",
    days: 56,
    system: "skin",
    conditionId: "itchy_skin",
    species: "both",
    who: "Pets doing a vet-guided 8-week food-elimination trial.",
    summary: "Eight strict weeks on a single novel/hydrolyzed diet — nothing else by mouth — to test for food allergy.",
    dailyTasks: [
      "Feed ONLY the trial diet — no other foods, treats, or flavored meds",
      "Rate itch 0–10",
      "Guard against scavenged food and table scraps",
      "Note any skin/ear/GI changes",
    ],
    whatToLog: ["Daily itch score", "Strict diet adherence (any slips)", "Skin/ear/GI signs", "Photos weekly"],
    reminders: ["Trial-diet meal only", "Evening itch score"],
    stopAndCallVet: [
      "Swelling, hives, or breathing trouble (urgent)",
      "Worsening sores or ear infection",
      "Questions interpreting the trial — keep your vet in the loop throughout",
    ],
    completionHint: "Even one off-diet slip can invalidate the trial. Review results with your vet, then do a guided re-challenge to confirm.",
    evidence: "A",
  },
  {
    id: "arthritis_mobility_30",
    title: "Arthritis Mobility Support",
    days: 30,
    system: "msk",
    conditionId: "arthritis",
    species: "both",
    who: "Pets with stiffness or known arthritis, for a month of mobility support.",
    summary: "A month of weight control, low-impact movement, and home tweaks to support comfortable joints.",
    dailyTasks: [
      "Keep to the measured, lean-weight feeding plan",
      "Do gentle, low-impact activity",
      "Use ramps/rugs; keep rest areas warm and soft",
      "Note stiffness after rest and on stairs",
    ],
    whatToLog: ["Stiffness/mobility (stairs, jumping)", "Activity tolerance", "Weight", "Response to changes"],
    reminders: ["Gentle activity", "Mobility check (after rest)"],
    stopAndCallVet: [
      "Non-weight-bearing, dragging a limb, or wobbliness",
      "Sudden severe pain",
      "Before adding pain medication or new supplements",
    ],
    completionHint: "Track whether stiffness and activity improved over the month — your vet can layer in pain control or therapy if needed.",
    evidence: "A",
  },
];

export function programById(id: string): ProgramTemplate | undefined {
  return PROGRAM_TEMPLATES.find((p) => p.id === id);
}

export function programsForSpecies(species: "dog" | "cat"): ProgramTemplate[] {
  return PROGRAM_TEMPLATES.filter((p) => p.species === "both" || p.species === species);
}

export interface ProgramProgress {
  daysLogged: number;
  totalDays: number;
  percent: number;
  status: "active" | "completed" | "stopped";
  summaryLine: string;
}

export function summarizeProgress(
  template: ProgramTemplate,
  daysLogged: number,
  status: "active" | "completed" | "stopped",
): ProgramProgress {
  const percent = Math.min(100, Math.round((daysLogged / template.days) * 100));
  const summaryLine =
    status === "stopped"
      ? `Stopped early after ${daysLogged} of ${template.days} days logged.`
      : percent >= 100
        ? `Completed — ${daysLogged} of ${template.days} days logged. ${template.completionHint}`
        : `${daysLogged} of ${template.days} days logged (${percent}%). Keep going and add the trend to your vet report.`;
  return { daysLogged, totalDays: template.days, percent, status, summaryLine };
}
