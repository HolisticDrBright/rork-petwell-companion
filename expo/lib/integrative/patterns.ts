import type { UrgencyKey } from "@/constants/colors";
import type { Pet, TimelineEntry } from "@/types/pet";

import { getSystem } from "./catalog";

/**
 * Root-Cause Pattern Detector.
 *
 * Reviews the pet's profile + logs and surfaces "patterns to watch" — NEVER
 * diagnoses. Each pattern is honest about confidence and missing information,
 * suggests the next logs that would sharpen the picture, offers low-risk first
 * steps, and always says when to escalate to a vet. Urgent patterns (e.g. a male
 * cat with urinary signs) override everything with a vet-now flag.
 */

export type PatternConfidence = "low" | "moderate" | "high";

export interface DetectedPattern {
  id: string;
  name: string;
  system: string;
  systemLabel: string;
  confidence: PatternConfidence;
  /** Set when the pattern itself implies urgency (overrides natural steps). */
  urgency?: UrgencyKey;
  urgent: boolean;
  summary: string;
  supportingSignals: string[];
  missingInfo: string[];
  nextLogs: string[];
  safeFirstSteps: string[];
  whenToEscalate: string[];
  /** Links to a protocol template / integrative plan system. */
  conditionId?: string;
}

const CONFIDENCE_RANK: Record<PatternConfidence, number> = { high: 3, moderate: 2, low: 1 };

function textOf(e: TimelineEntry): string {
  return `${e.title} ${e.detail ?? ""}`.toLowerCase();
}

interface Index {
  all: TimelineEntry[];
  find: (words: string[], categories?: TimelineEntry["category"][]) => TimelineEntry[];
}

function buildIndex(timeline: TimelineEntry[]): Index {
  return {
    all: timeline,
    find: (words, categories) =>
      timeline.filter((e) => {
        if (categories && !categories.includes(e.category)) return false;
        const t = textOf(e);
        return words.some((w) => t.includes(w));
      }),
  };
}

function confidenceFromCount(core: number): PatternConfidence {
  if (core >= 3) return "high";
  if (core === 2) return "moderate";
  return "low";
}

const NOT_A_DIAGNOSIS = "This is a pattern to watch, not a diagnosis — share it with your vet to confirm.";

type Detector = (pet: Pet, idx: Index) => DetectedPattern | null;

const sys = (id: string) => getSystem(id).label;

// 1 ── Food sensitivity ─────────────────────────────────────────
const foodSensitivity: Detector = (pet, idx) => {
  const itch = idx.find(["itch", "scratch", "paw lick", "licking", "red"], ["skin", "symptom"]);
  const softStool =
    idx.find(["loose", "soft", "mucus", "diarrhea"], ["stool", "symptom"]).concat(
      idx.all.filter((e) => e.category === "stool" && typeof e.value === "number" && (e.value as number) <= 5),
    );
  const proteinTreat = idx.find(["chicken", "beef", "lamb", "salmon", "treat", "chew", "new food"], ["food"]);
  const allergyHistory = pet.allergies.some((a) => /chicken|beef|protein|food/i.test(a)) || pet.conditions.some((c) => /food sensit|allerg/i.test(c));
  const signals: string[] = [];
  let core = 0;
  if (itch.length) { core++; signals.push(`Itching/skin: ${itch[0].title}`); }
  if (softStool.length) { core++; signals.push(`Soft stool: ${softStool[0].title}`); }
  if (proteinTreat.length) { signals.push(`Diet/treats: ${proteinTreat[0].title}`); if (allergyHistory) core++; }
  if (allergyHistory) signals.push(`History: ${pet.allergies[0] ?? "food sensitivity"}`);
  if (core < 2) return null;
  return {
    id: "food_sensitivity",
    name: "Possible food-sensitivity pattern",
    system: "skin",
    systemLabel: sys("skin"),
    confidence: confidenceFromCount(core + (allergyHistory ? 1 : 0)),
    urgent: false,
    summary: `Itch plus digestive changes around certain proteins can point to a food sensitivity. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["Which exact proteins are in current food/treats", "Whether itch tracks with meals", "Stool scores across a full week"],
    nextLogs: ["Rate itch 0–10 daily", "Log every food and treat with its main protein", "Score stool consistency"],
    safeFirstSteps: [
      "Pause novel treats and keep the diet consistent for now",
      "Ask your vet about a guided 8–12 week elimination diet",
      "Favor a single, simple protein while you track",
    ],
    whenToEscalate: ["Open sores, ear pain, or swelling", "Diarrhea lasting >48–72h or any blood", "No improvement after a vet-guided diet trial"],
    conditionId: "itchy_skin",
  };
};

// 2 ── Metabolic drift (weight) ─────────────────────────────────
const metabolicDrift: Detector = (pet, idx) => {
  const weights = idx.all.filter((e) => e.category === "weight" && typeof e.value === "number");
  const gain = weights.length >= 2 && (weights[0].value as number) > (weights[weights.length - 1].value as number);
  const gainNote = idx.find(["+0.", "gain", "heavier", "overweight"], ["weight"]);
  const lowActivity = idx.all.filter((e) => e.category === "activity").length <= 1;
  const treats = idx.find(["treat", "chew", "table", "scrap", "cheese", "biscuit"], ["food"]);
  const obeseFlag = pet.conditions.some((c) => /obes|overweight|weight/i.test(c));
  const signals: string[] = [];
  let core = 0;
  if (gain || gainNote.length) { core++; signals.push(`Weight trending up: ${(gainNote[0] ?? weights[0])?.title ?? "recent weigh-in"}`); }
  if (lowActivity) { core++; signals.push("Few activity logs recently"); }
  if (treats.length) { core++; signals.push(`Calorie-dense treats: ${treats[0].title}`); }
  if (obeseFlag) { signals.push("Weight is a flagged condition"); }
  if (core < 2) return null;
  return {
    id: "metabolic_drift",
    name: "Metabolic drift (creeping weight)",
    system: "metabolic",
    systemLabel: sys("metabolic"),
    confidence: confidenceFromCount(core + (obeseFlag ? 1 : 0)),
    urgent: false,
    summary: `Gradual weight gain with lower activity and rich treats can drift toward metabolic strain. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["A daily calorie/treat tally", "Body condition score", "Consistent weigh-ins"],
    nextLogs: ["Weigh in every 1–2 weeks", "Log treats and their calories", "Track activity minutes"],
    safeFirstSteps: [
      "Measure every meal to a vet-set calorie target",
      "Swap rich treats for green beans or counted kibble",
      "Add gentle daily activity",
    ],
    whenToEscalate: ["Excess thirst/urination with weight change (possible diabetes)", "Weakness or exercise intolerance", "Before any weight-loss plan, to rule out metabolic disease"],
    conditionId: "obesity_metabolic",
  };
};

// 3 ── Senior cat kidney / thyroid watch ────────────────────────
const kidneyThyroidWatch: Detector = (pet, idx) => {
  if (pet.species !== "cat") return null;
  const senior = pet.ageYears >= 10;
  const moreWater = idx.find(["drinking more", "more water", "increased", "thirst", "extra water"]);
  const weightLoss = idx.find(["-0.", "loss", "lost", "thinner", "weight loss"], ["weight"]);
  const renalFlag = pet.conditions.some((c) => /kidney|renal|ckd|thyroid|sdma|iris/i.test(c));
  const signals: string[] = [];
  let core = 0;
  if (senior) { signals.push(`Senior cat (${pet.ageYears} yr)`); core++; }
  if (moreWater.length) { signals.push(`Increased thirst: ${moreWater[0].title}`); core++; }
  if (weightLoss.length) { signals.push(`Weight loss: ${weightLoss[0].title}`); core++; }
  if (renalFlag) { signals.push("Kidney/thyroid already on the watch list"); }
  if (!senior || core < 2) return null;
  return {
    id: "kidney_thyroid_watch",
    name: "Senior-cat kidney / thyroid watch",
    system: "renal",
    systemLabel: sys("renal"),
    confidence: confidenceFromCount(core + (renalFlag ? 1 : 0)),
    urgent: false,
    summary: `In older cats, more drinking plus weight loss are classic clues for kidney or thyroid changes. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["Measured daily water intake", "Appetite trend", "Recent bloodwork (SDMA, T4)"],
    nextLogs: ["Note water intake daily", "Weigh in weekly", "Track appetite and litter-box output"],
    safeFirstSteps: [
      "Increase wet-food moisture and offer extra water stations",
      "Keep meals consistent and appetizing",
      "Book a senior bloodwork panel with your vet",
    ],
    whenToEscalate: ["Not eating, vomiting, or marked lethargy", "Rapid weight loss", "Ask your vet for kidney + thyroid testing soon"],
    conditionId: "kidney_hydration",
  };
};

// 4 ── Allergy / yeast (ear + paw + skin) ───────────────────────
const allergyYeast: Detector = (_pet, idx) => {
  const ear = idx.find(["ear", "odor", "smell", "head shak"]);
  const paw = idx.find(["paw", "licking", "chewing feet"]);
  const redness = idx.find(["red", "itch", "rash", "inflam", "scratch"], ["skin", "symptom"]);
  const signals: string[] = [];
  let core = 0;
  if (ear.length) { core++; signals.push(`Ear sign: ${ear[0].title}`); }
  if (paw.length) { core++; signals.push(`Paw licking: ${paw[0].title}`); }
  if (redness.length) { core++; signals.push(`Skin redness/itch: ${redness[0].title}`); }
  if (core < 2) return null;
  return {
    id: "allergy_yeast",
    name: "Allergy / yeast pattern",
    system: "skin",
    systemLabel: sys("skin"),
    confidence: confidenceFromCount(core),
    urgent: false,
    summary: `Itchy ears, paw-licking and red skin together often point to allergy-driven yeast overgrowth. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["Whether ears are painful or discharging", "Seasonal vs year-round timing", "Recent diet/environment changes"],
    nextLogs: ["Photograph ears and paws weekly", "Rate itch 0–10", "Note flares vs season/walks"],
    safeFirstSteps: [
      "Wipe paws after walks and keep ears dry",
      "Wash bedding fragrance-free and reduce allergens",
      "Ask your vet to check ears before any cleaner or drops",
    ],
    whenToEscalate: ["Painful, swollen, or discharging ears", "Open or spreading skin sores", "No improvement after environment changes"],
    conditionId: "ear_yeast",
  };
};

// 5 ── Pancreatitis concern (vomiting + fat + belly pain) ───────
const pancreatitisConcern: Detector = (_pet, idx) => {
  const vomiting = idx.find(["vomit", "throw up", "threw up"]);
  const fatty = idx.find(["fatty", "bacon", "cheese", "grease", "drippings", "table scrap", "rich meal", "high-fat", "high fat"]);
  const bellyPain = idx.find(["belly", "abdom", "hunch", "painful", "splinting", "won't lie"]);
  const signals: string[] = [];
  let core = 0;
  if (vomiting.length) { core++; signals.push(`Vomiting: ${vomiting[0].title}`); }
  if (fatty.length) { core++; signals.push(`Fatty food: ${fatty[0].title}`); }
  if (bellyPain.length) { core++; signals.push(`Belly pain: ${bellyPain[0].title}`); }
  if (core < 2) return null;
  const urgent = vomiting.length > 0 && bellyPain.length > 0;
  return {
    id: "pancreatitis_concern",
    name: "Pancreatitis concern",
    system: "hepatic",
    systemLabel: sys("hepatic"),
    confidence: confidenceFromCount(core),
    urgent,
    urgency: urgent ? "orange" : "amber",
    summary: `Vomiting after a fatty meal with belly pain can signal pancreatitis, which needs veterinary care — not home remedies. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["Whether pain is worsening", "How many vomiting episodes", "Hydration status"],
    nextLogs: ["Count vomiting episodes and contents", "Note appetite and energy", "Record any fatty foods given"],
    safeFirstSteps: [
      "Hold fatty treats and table scraps completely",
      "Have your vet assess before any food, enzyme, or supplement",
      "Offer water unless vomiting; don't force food",
    ],
    whenToEscalate: ["Repeated vomiting, severe belly pain, or collapse → see a vet now", "Not eating with lethargy", "Yellow gums or eyes"],
    conditionId: "pancreatitis",
  };
};

// 6 ── Gut adaptation (benign transition) ───────────────────────
const gutAdaptation: Detector = (_pet, idx) => {
  const looseStool = idx.find(["loose", "soft", "mucus"], ["stool", "symptom"]).concat(
    idx.all.filter((e) => e.category === "stool" && typeof e.value === "number" && (e.value as number) <= 6),
  );
  const probiotic = idx.find(["probiotic", "supplement started"]);
  const dietChange = idx.find(["new food", "switched", "transition", "new diet", "new kibble", "changed food", "food trial"]);
  const signals: string[] = [];
  let core = 0;
  if (looseStool.length) { core++; signals.push(`Stool change: ${looseStool[0].title}`); }
  if (probiotic.length) { core++; signals.push(`Probiotic: ${probiotic[0].title}`); }
  if (dietChange.length) { core++; signals.push(`Diet change: ${dietChange[0].title}`); }
  // Needs the diet-change/probiotic context to read as adaptation rather than illness.
  if (core < 2 || (probiotic.length === 0 && dietChange.length === 0)) return null;
  return {
    id: "gut_adaptation",
    name: "Diet-transition / gut-adaptation pattern",
    system: "gut",
    systemLabel: sys("gut"),
    confidence: confidenceFromCount(core),
    urgent: false,
    summary: `Mild loose stool right after a food change or new probiotic is often short-term gut adaptation. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["How fast the diet was switched", "Whether stool is improving day to day", "Any blood or vomiting"],
    nextLogs: ["Score stool daily", "Note the % of new vs old food", "Track energy and appetite"],
    safeFirstSteps: [
      "Slow the transition to over 5–7 days",
      "Add a little plain pumpkin for fiber",
      "Keep the probiotic consistent and watch for steady improvement",
    ],
    whenToEscalate: ["Blood or black/tarry stool, or repeated vomiting", "Diarrhea beyond 48–72h", "Any lethargy or weight loss"],
    conditionId: "chronic_diarrhea",
  };
};

// 7 ── Urinary obstruction risk (male cat) — URGENT ─────────────
const urinaryObstructionMaleCat: Detector = (pet, idx) => {
  if (pet.species !== "cat" || pet.sex !== "male") return null;
  const urinary = idx.find([
    "urin", "pee", "litter", "strain", "blood in urine", "crying in box", "in and out of box", "frequent trips", "can't urinate", "cannot urinate",
  ]);
  if (urinary.length === 0) return null;
  return {
    id: "urinary_obstruction_male_cat",
    name: "Urinary obstruction risk (male cat)",
    system: "renal",
    systemLabel: sys("renal"),
    confidence: "high",
    urgent: true,
    urgency: "red",
    summary:
      "A male cat straining or making frequent urinary trips can be a life-threatening blockage. This is an emergency — natural support does not apply.",
    supportingSignals: urinary.slice(0, 3).map((e) => `Urinary sign: ${e.title}`),
    missingInfo: ["Whether any urine is being produced", "How long signs have been present"],
    nextLogs: ["Note time of last urination — but do not delay care to log"],
    safeFirstSteps: [
      "Treat this as an emergency — go to a vet or ER now",
      "Do not give any home remedy, supplement, or herb",
    ],
    whenToEscalate: ["Now — straining or inability to urinate in a male cat is an emergency", "Vomiting, hiding, or crying in the litter box", "Any collapse or weakness"],
    conditionId: "kidney_hydration",
  };
};

// 8 ── Dental inflammation ──────────────────────────────────────
const dentalInflammation: Detector = (_pet, idx) => {
  const breath = idx.find(["bad breath", "breath", "halitosis"]);
  const tartar = idx.find(["tartar", "plaque", "gingiv", "red gums", "brown teeth"]);
  const eating = idx.find(["dropping food", "chewing one side", "won't chew", "drooling", "mouth pain"]);
  const signals: string[] = [];
  let core = 0;
  if (breath.length) { core++; signals.push(`Breath: ${breath[0].title}`); }
  if (tartar.length) { core++; signals.push(`Tartar/gums: ${tartar[0].title}`); }
  if (eating.length) { core++; signals.push(`Eating change: ${eating[0].title}`); }
  if (core < 2) return null;
  return {
    id: "dental_inflammation",
    name: "Dental inflammation pattern",
    system: "dental",
    systemLabel: sys("dental"),
    confidence: confidenceFromCount(core),
    urgent: false,
    summary: `Bad breath with tartar and changes in chewing suggest oral inflammation worth a dental check. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["When teeth were last cleaned", "Whether any tooth looks broken", "Appetite changes"],
    nextLogs: ["Note breath, chewing, and any dropped food", "Photograph gums/teeth", "Track appetite"],
    safeFirstSteps: [
      "Introduce gentle daily tooth-brushing or vet-approved dental chews",
      "Avoid hard items that can fracture teeth",
      "Book a dental exam to grade the gums",
    ],
    whenToEscalate: ["Won't eat or shows mouth pain", "Facial swelling or a broken/bleeding tooth", "Persistent bad breath despite home care"],
    conditionId: "dental_inflammation",
  };
};

// 9 ── Senior mobility decline ──────────────────────────────────
const seniorMobility: Detector = (pet, idx) => {
  const seniorAt = pet.species === "cat" ? 10 : 8;
  if (pet.ageYears < seniorAt) return null;
  const stiffness = idx.find(["stiff", "limp", "lame", "slow on stairs", "reluctant to jump", "trouble jumping", "sore"]);
  const lowActivity = idx.all.filter((e) => e.category === "activity").length <= 1;
  const arthritisFlag = pet.conditions.some((c) => /arthrit|joint|hip|mobility/i.test(c));
  const signals: string[] = [];
  let core = 0;
  signals.push(`Senior (${pet.ageYears} yr)`);
  if (stiffness.length) { core++; signals.push(`Stiffness: ${stiffness[0].title}`); }
  if (lowActivity) { core++; signals.push("Activity has dropped off"); }
  if (arthritisFlag) { core++; signals.push("Joint issue on file"); }
  if (core < 2) return null;
  return {
    id: "senior_mobility_decline",
    name: "Senior mobility decline",
    system: "msk",
    systemLabel: sys("msk"),
    confidence: confidenceFromCount(core),
    urgent: false,
    summary: `Stiffness and less movement in an older pet can reflect joint wear that responds well to early support. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["When stiffness is worst (after rest vs activity)", "Whether any limb is favored", "Current weight"],
    nextLogs: ["Note stiffness after rest and on stairs", "Track activity tolerance", "Weigh in monthly"],
    safeFirstSteps: [
      "Keep a lean weight — the single biggest mobility lever",
      "Add ramps, rugs, and a warm orthopedic bed",
      "Keep movement gentle, regular, and low-impact",
    ],
    whenToEscalate: ["Non-weight-bearing, dragging a limb, or wobbliness", "Sudden severe pain", "Before any pain medication or new supplement"],
    conditionId: "arthritis",
  };
};

// 10 ── Anxiety / stress ────────────────────────────────────────
const anxietyStress: Detector = (_pet, idx) => {
  const stress = idx.find(["anxious", "anxiety", "stress", "pacing", "hiding", "panting", "destructive", "vocaliz", "trembling", "cowering"]);
  const appetite = idx.find(["not eating", "off food", "appetite", "won't eat", "skipped"]);
  const signals: string[] = [];
  let core = 0;
  if (stress.length) { core++; signals.push(`Behavior: ${stress[0].title}`); }
  if (stress.length >= 2) { core++; signals.push(`Repeated episodes (${stress.length})`); }
  if (appetite.length) { core++; signals.push(`Appetite change: ${appetite[0].title}`); }
  if (core < 2) return null;
  return {
    id: "anxiety_stress",
    name: "Anxiety / stress pattern",
    system: "behavior",
    systemLabel: sys("behavior"),
    confidence: confidenceFromCount(core),
    urgent: false,
    summary: `Repeated anxious behavior, especially with appetite changes, is worth supporting with routine and enrichment. ${NOT_A_DIAGNOSIS}`,
    supportingSignals: signals,
    missingInfo: ["What triggers the episodes", "What helps them settle", "Whether anything physical changed"],
    nextLogs: ["Log triggers and intensity", "Note what calms them", "Track appetite and sleep"],
    safeFirstSteps: [
      "Keep a predictable routine and a safe 'den' space",
      "Add sniff walks, food puzzles, and play",
      "Consider a species-appropriate pheromone diffuser",
    ],
    whenToEscalate: ["Self-injury, panic, or aggression", "Not eating or drinking from stress", "Sudden change in a senior (rule out pain/illness)"],
    conditionId: "anxiety",
  };
};

const DETECTORS: Detector[] = [
  urinaryObstructionMaleCat, // urgent first
  pancreatitisConcern,
  foodSensitivity,
  allergyYeast,
  kidneyThyroidWatch,
  metabolicDrift,
  gutAdaptation,
  dentalInflammation,
  seniorMobility,
  anxietyStress,
];

export function detectPatterns(pet: Pet, timeline: TimelineEntry[]): DetectedPattern[] {
  const idx = buildIndex(timeline);
  const found = DETECTORS.map((d) => d(pet, idx)).filter((p): p is DetectedPattern => p !== null);
  // Urgent first, then by confidence.
  return found.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
  });
}

export const PATTERN_CONFIDENCE_LABEL: Record<PatternConfidence, string> = {
  low: "Low confidence",
  moderate: "Moderate confidence",
  high: "Higher confidence",
};

/** Total number of distinct patterns the detector can surface. */
export const PATTERN_LIBRARY_SIZE = DETECTORS.length;
